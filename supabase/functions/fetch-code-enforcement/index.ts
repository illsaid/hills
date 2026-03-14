import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const SOCRATA_ENDPOINT = "https://data.lacity.org/resource/u82d-eh7z.json";
const TARGET_ZIPS = ["90046", "90068", "90069"];

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? Deno.env.get("SERVICE_ROLE_KEY")!
    );

    const appToken = Deno.env.get("LACITY_APP_TOKEN");

    const zipFilters = TARGET_ZIPS.map((z) => `starts_with(zip, '${z}')`).join(" OR ");
    const where = `(${zipFilters}) AND stat='O'`;

    const params = new URLSearchParams({
      $where: where,
      $limit: "100",
      $offset: "0",
      $order: "adddttm DESC",
    });
    if (appToken) params.append("$$app_token", appToken);

    const url = `${SOCRATA_ENDPOINT}?${params.toString()}`;
    const response = await fetch(url);
    if (!response.ok) throw new Error(`Socrata HTTP ${response.status}`);

    const cases = await response.json() as Record<string, unknown>[];

    let saved = 0;
    let errors = 0;

    for (const c of cases) {
      const fullAddress = `${c.stno ?? ""} ${c.predir ?? ""} ${c.stname ?? ""} ${c.suffix ?? ""}`.replace(/\s+/g, " ").trim();

      const payload = {
        case_number: c.apno,
        address: fullAddress,
        case_type: c.aptype,
        violation_description: c.aptype,
        date_opened: c.adddttm,
        status: c.stat,
        council_district: null,
        updated_at: new Date().toISOString(),
      };

      const { error } = await supabase
        .from("code_enforcement")
        .upsert(payload, { onConflict: "case_number" });

      if (error) errors++;
      else saved++;
    }

    return new Response(
      JSON.stringify({ success: true, fetched: cases.length, saved, errors }),
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
