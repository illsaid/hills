import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const TARGET_ZIPS = [
  { zip: "90068", lat: 34.1164, lng: -118.3205 },
  { zip: "90046", lat: 34.1010, lng: -118.3620 },
  { zip: "90069", lat: 34.0906, lng: -118.3842 },
];
const AQI_API_URL = "https://airquality.googleapis.com/v1/currentConditions:lookup";

interface AQIResult {
  zip: string;
  aqi: number;
  pollutant: string;
  category: string;
}

async function fetchAQI(lat: number, lng: number, apiKey: string): Promise<Record<string, unknown>> {
  const response = await fetch(`${AQI_API_URL}?key=${apiKey}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      location: { latitude: lat, longitude: lng },
      extraComputations: ["DOMINANT_POLLUTANT_CONCENTRATION", "HEALTH_RECOMMENDATIONS"],
    }),
  });
  if (!response.ok) throw new Error(`AQI API Error: ${response.status}`);
  return await response.json();
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? Deno.env.get("SERVICE_ROLE_KEY")!
    );

    const googleApiKey = Deno.env.get("Maps_API_KEY") ?? Deno.env.get("GOOGLE_MAPS_API_KEY");
    if (!googleApiKey) {
      return new Response(
        JSON.stringify({ success: false, error: "Missing Maps API key" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const results: AQIResult[] = [];

    for (const loc of TARGET_ZIPS) {
      const data = await fetchAQI(loc.lat, loc.lng, googleApiKey);
      const indexes = (data.indexes ?? []) as Record<string, unknown>[];
      const index = indexes.find((i) => i.code === "uaqi") ?? indexes[0];
      results.push({
        zip: loc.zip,
        aqi: (index?.aqi as number) ?? 0,
        pollutant: (index?.dominantPollutant as string) ?? "Unknown",
        category: (index?.category as string) ?? "Unknown",
      });
    }

    const avgAQI = Math.round(results.reduce((acc, curr) => acc + curr.aqi, 0) / results.length);
    const dominantPollutant = results[0].pollutant;

    // Check previous reading for spike detection
    const { data: lastReading } = await supabase
      .from("neighborhood_intel")
      .select("metadata, created_at")
      .eq("source_name", "Google AQI")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    let spikeDetected = false;
    let priority = 3;
    let alertTitle = "Air Quality Update";

    if (lastReading?.metadata && (lastReading.metadata as Record<string, unknown>).avg_aqi) {
      const prevAQI = (lastReading.metadata as Record<string, unknown>).avg_aqi as number;
      const increase = ((avgAQI - prevAQI) / prevAQI) * 100;
      if (increase > 20 && avgAQI > 50) {
        spikeDetected = true;
        priority = 1;
        alertTitle = "SMOKE SPIKE DETECTED";
      }
    }

    await supabase.from("neighborhood_intel").insert({
      source_name: "Google AQI",
      title: alertTitle,
      description: `Current AQI: ${avgAQI} (${results[0].category}). Dominant: ${dominantPollutant}.`,
      url: `https://google.com/aqi/${Date.now()}`,
      category: spikeDetected ? "Safety" : "Weather",
      priority,
      published_at: new Date().toISOString(),
      metadata: {
        avg_aqi: avgAQI,
        locations: results,
        spike_detected: spikeDetected,
      },
    });

    return new Response(
      JSON.stringify({ success: true, data: { avgAQI, spikeDetected, results } }),
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
