import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const HIGH_PRIORITY_KEYWORDS = ["Fire", "Smoke", "LAPD", "Emergency", "Blaze", "Evacuation", "Wildfire", "Brush"];
const HILLS_KEYWORDS = [
  "hollywood hills", "beachwood canyon", "laurel canyon",
  "runyon canyon", "sunset plaza", "bird streets",
  "hollywood dell", "outpost estates", "nichols canyon",
  "lake hollywood", "cahuenga pass", "90068", "90046", "90069",
];
const HIGH_SIGNAL_HANDLES = [
  "LAFD", "LAPDHQ", "LACoFD", "CD4LosAngeles", "MayorOfLA",
  "KTLA", "CBSLA", "ABC7", "NBCLA", "LAist", "LADailyNews",
];
const MAX_AGE_HOURS = 48;

function isWithin48Hours(date: Date | null): boolean {
  if (!date) return false;
  const now = new Date();
  const cutoff = new Date(now.getTime() - MAX_AGE_HOURS * 60 * 60 * 1000);
  return date >= cutoff && date <= now;
}

function parseDateFromText(text: string): Date | null {
  const now = new Date();
  const daysMatch = text.match(/(\d+)\s*days?\s*ago/i);
  if (daysMatch) return new Date(now.getTime() - parseInt(daysMatch[1]) * 24 * 60 * 60 * 1000);
  const hoursMatch = text.match(/(\d+)\s*hours?\s*ago/i);
  if (hoursMatch) return new Date(now.getTime() - parseInt(hoursMatch[1]) * 60 * 60 * 1000);
  const minsMatch = text.match(/(\d+)\s*min(?:ute)?s?\s*ago/i);
  if (minsMatch) return new Date(now.getTime() - parseInt(minsMatch[1]) * 60 * 1000);
  const dateMatch = text.match(/(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+(\d{1,2}),?\s+(\d{4})/i);
  if (dateMatch) {
    const months = ["jan","feb","mar","apr","may","jun","jul","aug","sep","oct","nov","dec"];
    const month = months.findIndex((m) => m === dateMatch[1].toLowerCase());
    if (month !== -1) return new Date(parseInt(dateMatch[3]), month, parseInt(dateMatch[2]));
  }
  return null;
}

function containsHillsKeyword(text: string): boolean {
  if (!text) return false;
  const lower = text.toLowerCase();
  return HILLS_KEYWORDS.some((kw) => lower.includes(kw));
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

    const sociaVaultApiKey = Deno.env.get("SOCIAVAULT_API_KEY");
    const googleSearchApiKey = Deno.env.get("GOOGLE_SEARCH_API_KEY");
    const googleSearchCx = Deno.env.get("GOOGLE_SEARCH_CX");

    // Purge old posts
    const cutoff = new Date(Date.now() - MAX_AGE_HOURS * 60 * 60 * 1000);
    await supabase
      .from("neighborhood_intel")
      .delete()
      .eq("category", "News Feed")
      .lt("published_at", cutoff.toISOString());

    const allItems: Record<string, unknown>[] = [];
    const seenUrls = new Set<string>();

    // Source 1: SociaVault
    if (sociaVaultApiKey) {
      for (const handle of HIGH_SIGNAL_HANDLES) {
        try {
          const res = await fetch(
            `https://api.sociavault.com/v1/scrape/twitter/user-tweets?handle=${handle}`,
            { headers: { "X-API-Key": sociaVaultApiKey, "Accept": "application/json" } }
          );
          if (!res.ok) continue;
          const data = await res.json();
          const tweets = data.data?.tweets ? Object.values(data.data.tweets) : [];
          for (const tweet of tweets as Record<string, unknown>[]) {
            const legacy = (tweet.legacy ?? tweet) as Record<string, unknown>;
            const text = (legacy.full_text ?? legacy.text ?? "") as string;
            if (!containsHillsKeyword(text)) continue;
            const tweetDate = legacy.created_at ? new Date(legacy.created_at as string) : null;
            if (!isWithin48Hours(tweetDate)) continue;
            const tweetId = (tweet.rest_id ?? legacy.id_str ?? "") as string;
            const userResult = ((tweet.core as Record<string, unknown>)?.user_results as Record<string, unknown>)?.result as Record<string, unknown> ?? {};
            const userLegacy = (userResult.legacy ?? {}) as Record<string, unknown>;
            const screenName = (userLegacy.screen_name ?? handle) as string;
            const displayName = (userLegacy.name ?? screenName) as string;
            const url = `https://x.com/${screenName}/status/${tweetId}`;
            if (seenUrls.has(url)) continue;
            seenUrls.add(url);
            const isHighPriority = HIGH_PRIORITY_KEYWORDS.some((kw) => text.toLowerCase().includes(kw.toLowerCase()));
            allItems.push({
              source_name: "SociaVault (X)",
              title: `${displayName} (@${screenName}): "${text.slice(0, 100)}..."`,
              description: text,
              url,
              category: "News Feed",
              priority: isHighPriority ? 1 : 3,
              published_at: tweetDate!.toISOString(),
              metadata: { tweet_id: tweetId, handle: screenName, source: "sociavault" },
            });
          }
          await new Promise((r) => setTimeout(r, 200));
        } catch (_e) {
          // skip handle errors
        }
      }
    }

    // Source 2: Google Custom Search
    if (googleSearchApiKey && googleSearchCx) {
      const searchQuery = 'site:x.com ("Hollywood Hills" OR "Laurel Canyon" OR "Runyon Canyon" OR "90068" OR "90046")';
      const url = new URL("https://www.googleapis.com/customsearch/v1");
      url.searchParams.append("key", googleSearchApiKey);
      url.searchParams.append("cx", googleSearchCx);
      url.searchParams.append("q", searchQuery);
      url.searchParams.append("dateRestrict", "d[2]");
      url.searchParams.append("sort", "date");
      url.searchParams.append("num", "10");
      try {
        const res = await fetch(url.toString());
        if (res.ok) {
          const data = await res.json();
          const items = (data.items ?? []) as Record<string, unknown>[];
          for (const item of items) {
            const fullText = `${item.title} ${item.snippet}`;
            const postDate = parseDateFromText(fullText);
            if (!isWithin48Hours(postDate)) continue;
            const link = item.link as string;
            if (!link || seenUrls.has(link)) continue;
            seenUrls.add(link);
            let handle = "Unknown";
            const handleMatch = (item.title as string).match(/\(@([^\)]+)\)/);
            if (handleMatch) handle = handleMatch[1];
            else {
              const linkMatch = link.match(/x\.com\/([^\/]+)/);
              if (linkMatch) handle = linkMatch[1];
            }
            const isHighPriority = HIGH_PRIORITY_KEYWORDS.some((kw) => fullText.toLowerCase().includes(kw.toLowerCase()));
            allItems.push({
              source_name: "Google Search (X)",
              title: item.title,
              description: item.snippet,
              url: link,
              category: "News Feed",
              priority: isHighPriority ? 1 : 3,
              published_at: (postDate ?? new Date()).toISOString(),
              metadata: { handle, source: "google" },
            });
          }
        }
      } catch (_e) {
        // skip google errors
      }
    }

    let upserted = 0;
    if (allItems.length > 0) {
      const { data, error } = await supabase
        .from("neighborhood_intel")
        .upsert(allItems, { onConflict: "url", ignoreDuplicates: true })
        .select();
      if (error) throw error;
      upserted = data?.length ?? 0;
    }

    return new Response(
      JSON.stringify({ success: true, total: allItems.length, upserted }),
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
