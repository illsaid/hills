import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const GRID_POINT_URL = "https://api.weather.gov/gridpoints/LOX/152,48/forecast/hourly";
const ALERTS_URL = "https://api.weather.gov/alerts/active?zone=CAZ368";
const USER_AGENT = "(hills-ledger-app, contact@example.com)";

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? Deno.env.get("SERVICE_ROLE_KEY")!
    );

    const { searchParams } = new URL(req.url);
    const sim = searchParams.get("sim");

    const now = new Date();
    let weatherData: Record<string, unknown> | null = null;
    const computedAlerts: Record<string, unknown>[] = [];
    const alertsToDelete: string[] = [];

    // Fetch weather forecast
    const weatherRes = await fetch(GRID_POINT_URL, {
      headers: { "User-Agent": USER_AGENT },
    });

    if (weatherRes.ok) {
      const json = await weatherRes.json();
      const periods = json.properties?.periods ?? [];
      const current =
        periods.find((p: Record<string, unknown>) => {
          const start = new Date(p.startTime as string);
          const end = new Date(p.endTime as string);
          return now >= start && now < end;
        }) ?? periods[0];

      if (current) {
        const windMph = parseInt((current.windSpeed as string)?.split(" ")[0] ?? "0");
        const humidity = (current.relativeHumidity as Record<string, unknown>)?.value ?? 0;

        weatherData = {
          temp: current.temperature,
          condition: current.shortForecast,
          windSpeed: current.windSpeed,
          humidity,
          icon: current.icon,
        };

        const redFlagId = "system-logic-red-flag-warning";
        if (sim === "red_flag" || (humidity > 0 && (humidity as number) <= 15 && windMph >= 25)) {
          computedAlerts.push({
            event: "Red Flag Warning",
            type: "FIRE_WEATHER",
            level: "CRITICAL",
            impact: 5,
            headline: "CRITICAL RED FLAG WARNING",
            description: `EXTREME FIRE DANGER DETECTED. Humidity is ${humidity}% and Wind is ${windMph} mph. LAFD Parking Restrictions in effect.`,
            source_url: redFlagId,
            confidence: "Automated Logic Gate",
          });
        } else {
          alertsToDelete.push(redFlagId);
        }

        const windAdvisoryId = "system-logic-wind-advisory";
        if (sim === "wind_advisory" || windMph >= 46) {
          computedAlerts.push({
            event: "Wind Advisory",
            type: "WEATHER",
            level: "ADVISORY",
            impact: 3,
            headline: "WIND ADVISORY",
            description: `High winds detected. Sustained winds or gusts exceeding 46 mph. Secure loose items.`,
            source_url: windAdvisoryId,
            confidence: "Automated Logic Gate",
          });
        } else {
          alertsToDelete.push(windAdvisoryId);
        }
      }
    }

    // Fetch NWS alerts
    const alertsRes = await fetch(ALERTS_URL, { headers: { "User-Agent": USER_AGENT } });
    let activeAlerts: Record<string, unknown>[] = [];
    if (alertsRes.ok) {
      const json = await alertsRes.json();
      activeAlerts = json.features ?? [];
    }

    // Get area
    const { data: area } = await supabase
      .from("areas")
      .select("id")
      .eq("slug", "hollywood-hills")
      .maybeSingle();

    if (area) {
      if (alertsToDelete.length > 0) {
        await supabase.from("events").delete().in("source_url", alertsToDelete);
      }

      for (const alert of computedAlerts) {
        const { data: existing } = await supabase
          .from("events")
          .select("id")
          .eq("source_url", alert.source_url)
          .maybeSingle();

        if (!existing) {
          await supabase.from("events").insert({
            area_id: area.id,
            source_id: null,
            event_type: alert.type,
            level: alert.level,
            verification: "VERIFIED",
            impact: alert.impact,
            title: alert.headline,
            summary: alert.description,
            location_label: "System Logic (NWS Data)",
            observed_at: now.toISOString(),
            source_url: alert.source_url,
            confidence_basis: alert.confidence,
          });
        } else {
          await supabase
            .from("events")
            .update({ observed_at: now.toISOString(), summary: alert.description })
            .eq("source_url", alert.source_url);
        }
      }

      for (const feature of activeAlerts) {
        const props = feature.properties as Record<string, unknown>;
        if (
          props.event === "Wind Advisory" ||
          props.event === "Red Flag Warning" ||
          props.severity === "Severe"
        ) {
          const { data: existing } = await supabase
            .from("events")
            .select("id")
            .eq("source_url", props.id)
            .maybeSingle();

          if (!existing) {
            const eventStr = props.event as string;
            await supabase.from("events").insert({
              area_id: area.id,
              source_id: null,
              event_type: eventStr.includes("Fire") ? "FIRE_WEATHER" : "WEATHER",
              level:
                props.severity === "Severe" || props.event === "Red Flag Warning"
                  ? "CRITICAL"
                  : "ADVISORY",
              verification: "VERIFIED",
              impact: props.event === "Red Flag Warning" ? 5 : 3,
              title: props.event,
              summary:
                props.headline ??
                (props.description as string)?.substring(0, 200),
              location_label: "NWS Los Angeles",
              observed_at: now.toISOString(),
              source_url: props.id,
              confidence_basis: "National Weather Service API",
            });
          }
        }
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        weather: weatherData,
        computedAlerts: computedAlerts.length,
        deletedAlerts: alertsToDelete.length,
        nwsAlerts: activeAlerts.length,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return new Response(JSON.stringify({ success: false, error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
