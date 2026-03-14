import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const ARCGIS_ENDPOINT =
  "https://services.arcgis.com/RmCCgQtiZLDCtblq/arcgis/rest/services/Fictitious_Business_Name/FeatureServer/0/query";
const TARGET_ZIPS = ["90046", "90068", "90069"];
const CATEGORIES: Record<string, string[]> = {
  Contractor: ["Construction", "Remodeling", "Electric", "Plumbing", "Roofing"],
  Investor: ["Holdings", "Investments", "Properties", "LLC"],
  Service: ["Care", "Wellness", "Delivery", "Airbnb", "Cleaning"],
};

function extractCategory(businessName: string): string | null {
  if (!businessName) return null;
  const name = businessName.toUpperCase();
  for (const [cat, keywords] of Object.entries(CATEGORIES)) {
    for (const kw of keywords) {
      if (name.includes(kw.toUpperCase())) return cat;
    }
  }
  return null;
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

    const zipWhere = TARGET_ZIPS.map((z) => `BusinessZipCode = '${z}'`).join(" OR ");
    const params = new URLSearchParams({
      where: zipWhere,
      outFields: "*",
      outSR: "4326",
      f: "json",
      orderByFields: "FiledTS DESC",
      resultRecordCount: "100",
    });

    const url = `${ARCGIS_ENDPOINT}?${params.toString()}`;
    const response = await fetch(url);
    if (!response.ok) throw new Error(`ArcGIS HTTP ${response.status}`);

    const json = await response.json();
    if (json.error) throw new Error(`ArcGIS Error: ${json.error.message}`);

    const features = (json.features ?? []) as Record<string, unknown>[];

    let saved = 0;
    let errors = 0;

    for (const feature of features) {
      const attr = feature.attributes as Record<string, unknown>;
      if (!attr.BusinessName || !attr.FiledTS) continue;

      const bizName = attr.BusinessName as string;
      const filingDate = new Date(attr.FiledTS as number);

      // Check renewal: look for prior record filed more than 4 years earlier
      const cutoff = new Date(filingDate);
      cutoff.setFullYear(cutoff.getFullYear() - 4);

      const { data: priorRecord } = await supabase
        .from("raw_fbns")
        .select("id")
        .eq("business_name", bizName)
        .lt("filing_date", cutoff.toISOString())
        .limit(1)
        .maybeSingle();

      const isRenewal = !!priorRecord;
      const category = extractCategory(bizName);

      const payload = {
        filing_number: attr.FilingNumber,
        business_name: bizName,
        street_address: attr.BusinessAddress,
        city: attr.BusinessCity,
        state: attr.BusinessState,
        zip_code: attr.BusinessZipCode,
        filing_date: filingDate.toISOString(),
        owner_name: attr.RegisteredOwnerName,
        is_renewal: isRenewal,
        category,
        raw_data: attr,
        source_id: attr.GlobalID ?? attr.FilingNumber,
      };

      const { error } = await supabase
        .from("raw_fbns")
        .upsert(payload, { onConflict: "source_id" });

      if (error) errors++;
      else saved++;
    }

    return new Response(
      JSON.stringify({ success: true, fetched: features.length, saved, errors }),
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
