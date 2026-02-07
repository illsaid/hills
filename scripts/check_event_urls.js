
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function checkUrls() {
    console.log("Checking events for source_url...");

    // Fetch recent events that are NOT Community News (since we filtered those out)
    // We want to see if the remaining events (which likely show up as OTHER or Event) have URLs.
    const { data: events, error } = await supabase
        .from('events')
        .select('title, source_url, event_type')
        //.neq('source.name', 'Community News') // can't filter joined, so we filter in memory or assume
        .limit(20);

    if (error) console.error(error);
    else {
        console.log("Sample Events:");
        events.forEach(e => {
            console.log(`[${e.event_type}] ${e.title?.substring(0, 30)}... URL: ${e.source_url ? 'YES (' + e.source_url.substring(0, 20) + '...)' : 'NO'}`);
        });
    }
}
checkUrls();
