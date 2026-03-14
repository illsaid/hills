import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const PRIORITY_SOURCES = ["latimes", "ktla", "laist", "la times", "los angeles times"];
const HIGH_PRIORITY_KEYWORDS = ["fire", "smoke", "emergency", "evacuation", "wildfire", "brush fire", "lapd", "lafd"];
const HILLS_KEYWORDS = [
  "hollywood hills", "beachwood canyon", "laurel canyon",
  "runyon canyon", "sunset plaza", "bird streets",
  "hollywood dell", "outpost estates", "nichols canyon",
  "lake hollywood", "cahuenga pass", "griffith park",
  "mulholland", "hollywood sign",
  "90068", "90046", "90069",
  "east hollywood", "los feliz",
  "silverlake", "silver lake", "echo park",
  "griffith observatory", "hollywood bowl", "universal studios",
];
const MAX_AGE_HOURS = 48;
const SEARCH_QUERIES = ['"Hollywood Hills"', '"Laurel Canyon"', '"Griffith Park"', '"East Hollywood" fire'];

function containsHillsKeyword(text: string): boolean {
  if (!text) return false;
  const lower = text.toLowerCase();
  return HILLS_KEYWORDS.some((kw) => lower.includes(kw));
}

function isPrioritySource(sourceName: string): boolean {
  if (!sourceName) return false;
  const lower = sourceName.toLowerCase();
  return PRIORITY_SOURCES.some((ps) => lower.includes(ps));
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

    const newsDataApiKey = Deno.env.get("NEWSDATA_API_KEY");
    if (!newsDataApiKey) {
      return new Response(
        JSON.stringify({ success: false, error: "Missing NEWSDATA_API_KEY" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Purge old news articles
    const cutoff = new Date(Date.now() - MAX_AGE_HOURS * 60 * 60 * 1000);
    await supabase
      .from("neighborhood_intel")
      .delete()
      .eq("category", "News Feed")
      .eq("metadata->>source_type", "news")
      .lt("published_at", cutoff.toISOString());

    const now = new Date();
    const results: Record<string, unknown>[] = [];
    const seenUrls = new Set<string>();

    for (const query of SEARCH_QUERIES) {
      try {
        const url = new URL("https://newsdata.io/api/1/news");
        url.searchParams.append("apikey", newsDataApiKey);
        url.searchParams.append("q", query);
        url.searchParams.append("language", "en");
        url.searchParams.append("country", "us");

        const res = await fetch(url.toString());
        if (!res.ok) continue;

        const data = await res.json();
        if (data.status !== "success" || !data.results) continue;

        for (const article of data.results as Record<string, unknown>[]) {
          const articleDate = article.pubDate ? new Date(article.pubDate as string) : null;
          if (articleDate && articleDate < cutoff) continue;

          const fullText = `${article.title ?? ""} ${article.description ?? ""} ${article.content ?? ""}`;
          if (!containsHillsKeyword(fullText)) continue;

          const link = article.link as string;
          if (!link || seenUrls.has(link)) continue;
          seenUrls.add(link);

          const isHighPriority = HIGH_PRIORITY_KEYWORDS.some((kw) => fullText.toLowerCase().includes(kw));
          const sourceName = (article.source_name ?? article.source_id ?? "NewsData") as string;
          const isPriority = isPrioritySource(sourceName);

          results.push({
            source_name: `NewsData (${sourceName})`,
            title: article.title ?? "Untitled",
            description: article.description ?? (article.content as string)?.slice(0, 300) ?? "",
            url: link,
            category: "News Feed",
            priority: isHighPriority ? 1 : isPriority ? 2 : 3,
            published_at: (articleDate ?? now).toISOString(),
            metadata: {
              source_id: article.source_id,
              source_name: sourceName,
              source_type: "news",
              image_url: article.image_url,
              keywords: article.keywords,
              is_priority_source: isPriority,
              scraped_at: now.toISOString(),
            },
          });
        }

        await new Promise((r) => setTimeout(r, 500));
      } catch (_e) {
        // skip query errors
      }
    }

    let upserted = 0;
    if (results.length > 0) {
      const { data, error } = await supabase
        .from("neighborhood_intel")
        .upsert(results, { onConflict: "url", ignoreDuplicates: true })
        .select();
      if (error) throw error;
      upserted = data?.length ?? 0;
    }

    return new Response(
      JSON.stringify({ success: true, total: results.length, upserted }),
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
