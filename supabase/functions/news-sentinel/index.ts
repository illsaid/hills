import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const PRIORITY_SOURCES = ["latimes", "ktla", "laist", "la times", "los angeles times", "kcrw", "abc7", "nbc4", "cbsla"];
const HIGH_PRIORITY_KEYWORDS = ["fire", "smoke", "emergency", "evacuation", "wildfire", "brush fire", "lapd", "lafd", "earthquake", "mudslide", "flood"];

const HILLS_KEYWORDS = [
  "hollywood hills",
  "beachwood canyon",
  "laurel canyon",
  "runyon canyon",
  "sunset plaza",
  "bird streets",
  "hollywood dell",
  "outpost estates",
  "nichols canyon",
  "lake hollywood",
  "cahuenga pass",
  "mulholland drive",
  "mulholland highway",
  "hollywood sign",
  "griffith park",
  "griffith observatory",
  "hollywood bowl",
  "90068",
  "90046",
  "90069",
];

const SEARCH_QUERIES = [
  '"Hollywood Hills"',
  '"Laurel Canyon" Los Angeles',
  '"Beachwood Canyon"',
  '"Griffith Park" fire OR emergency OR crime',
  '"Runyon Canyon"',
  '"Hollywood Hills" fire OR emergency OR evacuation',
  '"Mulholland Drive" OR "Mulholland Highway" Los Angeles',
];

const MAX_AGE_HOURS = 48;

function containsHillsKeyword(text: string): boolean {
  if (!text) return false;
  const lower = text.toLowerCase();
  return HILLS_KEYWORDS.some((kw) => lower.includes(kw));
}

function isPrioritySource(url: string, title: string): boolean {
  const combined = `${url} ${title}`.toLowerCase();
  return PRIORITY_SOURCES.some((ps) => combined.includes(ps));
}

function parseRssPubDate(dateStr: string): Date | null {
  try {
    const d = new Date(dateStr);
    return isNaN(d.getTime()) ? null : d;
  } catch {
    return null;
  }
}

function extractTextContent(xml: string, tag: string): string {
  const cdataMatch = new RegExp(`<${tag}[^>]*><!\\[CDATA\\[([\\s\\S]*?)\\]\\]></${tag}>`, "i").exec(xml);
  if (cdataMatch) return cdataMatch[1].trim();
  const plainMatch = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`, "i").exec(xml);
  return plainMatch ? plainMatch[1].replace(/<[^>]+>/g, "").trim() : "";
}

function parseRssItems(xml: string): Array<{ title: string; link: string; description: string; pubDate: string; source: string }> {
  const items: Array<{ title: string; link: string; description: string; pubDate: string; source: string }> = [];
  const itemMatches = xml.matchAll(/<item>([\s\S]*?)<\/item>/gi);

  for (const match of itemMatches) {
    const itemXml = match[1];
    const title = extractTextContent(itemXml, "title");
    const description = extractTextContent(itemXml, "description");
    const pubDate = extractTextContent(itemXml, "pubDate");

    const linkCdata = /<link[^>]*><!\\[CDATA\\[([\\s\\S]*?)\\]\\]><\/link>/i.exec(itemXml);
    const linkPlain = /<link[^>]*>([^<]+)<\/link>/i.exec(itemXml);
    const link = linkCdata?.[1]?.trim() ?? linkPlain?.[1]?.trim() ?? "";

    const sourceMatch = /<source[^>]+url="([^"]+)"[^>]*>([^<]+)<\/source>/i.exec(itemXml);
    const source = sourceMatch?.[2]?.trim() ?? "";

    if (title && link) {
      items.push({ title, link, description, pubDate, source });
    }
  }

  return items;
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
        const rssUrl = `https://news.google.com/rss/search?q=${encodeURIComponent(query)}&hl=en-US&gl=US&ceid=US:en`;
        const res = await fetch(rssUrl, {
          headers: {
            "User-Agent": "Mozilla/5.0 (compatible; HillsLedger/1.0)",
            "Accept": "application/rss+xml, application/xml, text/xml",
          },
        });

        if (!res.ok) continue;

        const xml = await res.text();
        const items = parseRssItems(xml);

        for (const item of items) {
          const articleDate = parseRssPubDate(item.pubDate);
          if (articleDate && articleDate < cutoff) continue;

          const fullText = `${item.title} ${item.description}`;
          if (!containsHillsKeyword(fullText)) continue;

          const link = item.link;
          if (!link || seenUrls.has(link)) continue;
          seenUrls.add(link);

          const isHighPriority = HIGH_PRIORITY_KEYWORDS.some((kw) => fullText.toLowerCase().includes(kw));
          const isPriority = isPrioritySource(link, item.source);

          results.push({
            source_name: item.source || "Google News",
            title: item.title,
            description: item.description.slice(0, 400),
            url: link,
            category: "News Feed",
            priority: isHighPriority ? 1 : isPriority ? 2 : 3,
            published_at: (articleDate ?? now).toISOString(),
            metadata: {
              source_type: "news",
              is_priority_source: isPriority,
              scraped_at: now.toISOString(),
              query,
            },
          });
        }

        await new Promise((r) => setTimeout(r, 300));
      } catch {
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
