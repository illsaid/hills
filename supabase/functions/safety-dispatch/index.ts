import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const BASE_URL = "https://lafd.org";
const ALERTS_URL = "https://lafd.org/alerts";
const DISTRICT_KEYWORDS = ["District 4", "Council District 4", "CD4", "CD 4"];
const PRIORITY_1_KEYWORDS = ["BRUSH FIRE", "STRUCTURE FIRE", "WILDFIRE", "BRUSH", "HIKER"];
const PRIORITY_2_KEYWORDS = ["SMOKE", "VEGETATION", "RESCUE", "COLLISION"];

function isDistrict4(text: string): boolean {
  if (!text) return false;
  const lower = text.toLowerCase();
  return DISTRICT_KEYWORDS.some((kw) => lower.includes(kw.toLowerCase()));
}

function getPriority(title: string): number {
  const upper = title.toUpperCase();
  if (PRIORITY_1_KEYWORDS.some((kw) => upper.includes(kw))) return 1;
  if (PRIORITY_2_KEYWORDS.some((kw) => upper.includes(kw))) return 2;
  return 3;
}

async function fetchPage(url: string): Promise<string> {
  const response = await fetch(url, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    },
  });
  if (!response.ok) throw new Error(`Failed to fetch ${url}: ${response.status}`);
  return await response.text();
}

function extractLinks(html: string): { href: string; title: string }[] {
  const results: { href: string; title: string }[] = [];
  const seen = new Set<string>();
  const linkRegex = /<a\s+[^>]*href="(\/alert\/[^"]+|https:\/\/lafd\.org\/alert\/[^"]+)"[^>]*>([\s\S]*?)<\/a>/gi;
  let match;
  while ((match = linkRegex.exec(html)) !== null) {
    const href = match[1];
    const rawTitle = match[2].replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim();
    if (href && rawTitle && !seen.has(href)) {
      seen.add(href);
      results.push({ href, title: rawTitle });
    }
  }
  return results;
}

function extractText(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
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

    const listHtml = await fetchPage(ALERTS_URL);
    const links = extractLinks(listHtml);

    const maxItems = 8;
    const safetyItems: Record<string, unknown>[] = [];

    for (let i = 0; i < Math.min(links.length, maxItems); i++) {
      const { href, title } = links[i];
      const fullUrl = href.startsWith("http") ? href : BASE_URL + href;

      await new Promise((r) => setTimeout(r, 200));

      try {
        const detailHtml = await fetchPage(fullUrl);
        const content = extractText(detailHtml);

        if (!isDistrict4(content)) continue;

        let publishedAt = new Date().toISOString();
        const dateMatch = title.match(/(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})/);
        const timeMatch = (title + " " + content).match(/(\d{1,2}):(\d{2})\s*(am|pm|AM|PM)?/);

        if (dateMatch) {
          const month = parseInt(dateMatch[1]);
          const day = parseInt(dateMatch[2]);
          const year = parseInt(dateMatch[3]);
          let hours = 12;
          let minutes = 0;

          if (timeMatch) {
            let h = parseInt(timeMatch[1]);
            const m = parseInt(timeMatch[2]);
            const meridiem = timeMatch[3]?.toLowerCase();
            if (meridiem === "pm" && h < 12) h += 12;
            if (meridiem === "am" && h === 12) h = 0;
            hours = h;
            minutes = m;
          }

          const dt = new Date(year, month - 1, day, hours, minutes, 0);
          if (!isNaN(dt.getTime())) publishedAt = dt.toISOString();
        }

        safetyItems.push({
          source_name: "LAFD Alert",
          title,
          description: content.slice(0, 200).replace(/\s+/g, " ").trim() + "...",
          url: fullUrl,
          category: "Safety",
          priority: getPriority(title),
          published_at: publishedAt,
        });
      } catch (_e) {
        // skip individual page errors
      }
    }

    let upserted = 0;
    if (safetyItems.length > 0) {
      const { data, error } = await supabase
        .from("neighborhood_intel")
        .upsert(safetyItems, { onConflict: "url", ignoreDuplicates: false })
        .select();
      if (error) throw error;
      upserted = data?.length ?? 0;
    }

    return new Response(
      JSON.stringify({ success: true, checked: Math.min(links.length, maxItems), matched: safetyItems.length, upserted }),
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
