
import feedparser
import json
import os
import urllib.parse
from datetime import datetime
from difflib import SequenceMatcher
import re

# Configuration
RSS_BASE = "https://news.google.com/rss/search"
BLOCKED_DOMAINS = ["msn.com", "yahoo.com", "aol.com", "marketwatch.com", "businessinsider.com"]

# Keywords (Case-insensitive)
KEYWORDS = [
    "Hollywood Hills", "Laurel Canyon", "Runyon Canyon", "Mulholland",
    "Beachwood Canyon", "Nichols Canyon", "Bird Streets",
    "Sunset Strip", "Hollywood Blvd", "Franklin Ave",
    "90046", "90068", "90069",
    "Griffith Park", "Hollywood Bowl",
    "Cahuenga Pass", "Hollywood Reservoir", "Lake Hollywood",
    "Hollywood sign", "Sunset Plaza",
    "Laurel Canyon Boulevard", "Laurel Cyn",
    "Outpost Drive", "Wonderland Avenue",
    "H'wood Hills", "Hills fire", "Hills crash", "Hills traffic"
]

def clean_html(raw_html):
    cleaner = re.compile('<.*?>')
    text = re.sub(cleaner, '', raw_html)
    return text.strip()

def is_blocked(link):
    for domain in BLOCKED_DOMAINS:
        if domain in link:
            return True
    return False

def similar(a, b):
    return SequenceMatcher(None, a, b).ratio()

def fetch_and_filter():
    print("Starting News Feed aggregation via Google News RSS...")
    
    # Construct Query
    # Group keywords with OR
    query_terms = ' OR '.join([f'"{k}"' for k in KEYWORDS])
    # Add time filter (last 7 days) and location intent
    full_query = f"({query_terms}) when:7d"
    
    encoded_query = urllib.parse.quote(full_query)
    rss_url = f"{RSS_BASE}?q={encoded_query}&hl=en-US&gl=US&ceid=US:en"
    
    print(f"   Querying: {rss_url[:100]}...")
    
    try:
        d = feedparser.parse(rss_url)
        all_articles = []
        
        for entry in d.entries:
            title = entry.get('title', '')
            link = entry.get('link', '')
            description = entry.get('summary', '') or entry.get('description', '')
            published = entry.get('published', '')
            
            # Simple Domain Filter
            if is_blocked(link):
                continue
                
            # Parse Date
            pub_ts = datetime.now().isoformat()
            if hasattr(entry, 'published_parsed') and entry.published_parsed:
                dt = datetime(*entry.published_parsed[:6])
                pub_ts = dt.isoformat()

            source_name = "Google News"
            if 'source' in entry:
                source_name = entry.source.title if 'title' in entry.source else entry.source.get('content', 'Google News')

            article = {
                "headline": title,
                "source": source_name,
                "url": link,
                "published": pub_ts,
                "summary": clean_html(description),
                "keyword_match": "Query Match" # Google did the matching
            }
            all_articles.append(article)
            
    except Exception as e:
        print(f"      ❌ Failed to fetch RSS: {e}")
        return

    # Deduplication
    print(f"   Fetched {len(all_articles)} articles. Deduplicating...")
    unique_articles = []
    seen_titles = []
    
    # Sort by date desc (newest first)
    all_articles.sort(key=lambda x: x['published'], reverse=True)
    
    for article in all_articles:
        # Clean title (Google News often adds " - Source Name" at the end)
        clean_title = article['headline'].rsplit(' - ', 1)[0]
        
        is_dup = False
        for seen in seen_titles:
            if similar(clean_title.lower(), seen.lower()) > 0.8:
                is_dup = True
                break
        
        if not is_dup:
            # Check if title strictly contains at least ONE keyword to ensure high relevance
            # (sometimes Google broad matches too much)
            if any(k.lower() in clean_title.lower() for k in KEYWORDS) or \
               any(k.lower() in article['summary'].lower() for k in KEYWORDS):
                unique_articles.append(article)
                seen_titles.append(clean_title)

    # Limit to top 20
    final_feed = unique_articles[:20]
    
    # Save
    data = {
        "updated_at": datetime.now().isoformat(),
        "items": final_feed
    }
    
    print(f"   Saving {len(final_feed)} items to data/news_feed.json")
    
    out_path = os.path.join("data", "news_feed.json")
    os.makedirs("data", exist_ok=True)
    with open(out_path, "w") as f:
        json.dump(data, f, indent=2)

if __name__ == "__main__":
    fetch_and_filter()
