
import feedparser
import json
import os
from datetime import datetime
import re
from difflib import SequenceMatcher

# Configuration
FEEDS = [
    {"source": "LA Times", "url": "https://www.latimes.com/california/rss2.0.xml"},
    {"source": "KTLA", "url": "https://ktla.com/feed"},
    {"source": "LA Mag", "url": "https://lamag.com/feed"},
    {"source": "Canyon News", "url": "https://www.canyon-news.com/feed"}
]

# Keywords (Case-insensitive)
KEYWORDS = [
    "Hollywood Hills", "Laurel Canyon", "Runyon Canyon", "Mulholland",
    "Beachwood Canyon", "Nichols Canyon", "Bird Streets",
    "Sunset Strip", "Hollywood Blvd", "Franklin Ave",
    "90046", "90068", "90069",
    "Runyon", "Griffith Park", "Hollywood Bowl"
]

def clean_html(raw_html):
    cleaner = re.compile('<.*?>')
    text = re.sub(cleaner, '', raw_html)
    return text.strip()

def is_relevant(text):
    if not text:
        return False
    # Check for keywords
    text_lower = text.lower()
    for kw in KEYWORDS:
        if kw.lower() in text_lower:
            return kw
    return None

def similar(a, b):
    return SequenceMatcher(None, a, b).ratio()

def fetch_and_filter():
    print(f"Starting News Feed aggregation for {len(FEEDS)} sources...")
    
    all_articles = []
    
    for feed_cfg in FEEDS:
        print(f"   Fetching {feed_cfg['source']}...")
        try:
            d = feedparser.parse(feed_cfg['url'], agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64)")
            
            if d.bozo:
                pass # warnings.warn(d.bozo_exception) usually fine
                
            for entry in d.entries:
                # Extract basic fields
                title = entry.get('title', '')
                link = entry.get('link', '')
                description = entry.get('summary', '') or entry.get('description', '')
                
                # Check relevance
                hit_kw = is_relevant(title) or is_relevant(description)
                
                if hit_kw:
                    # Parse date
                    published = entry.get('published', '') or entry.get('updated', '')
                    # Attempt to standardize date (feedparser usually does this in entry.published_parsed)
                    pub_ts = None
                    if hasattr(entry, 'published_parsed') and entry.published_parsed:
                        dt = datetime(*entry.published_parsed[:6])
                        pub_ts = dt.isoformat()
                    else:
                        pub_ts = datetime.now().isoformat()
                        
                    article = {
                        "headline": title.strip(),
                        "source": feed_cfg['source'],
                        "url": link,
                        "published": pub_ts,
                        "summary": clean_html(description)[:200] + "...",
                        "keyword_match": hit_kw
                    }
                    all_articles.append(article)
                    
        except Exception as e:
            print(f"      ❌ Failed: {e}")

    # Deduplication
    print(f"   Found {len(all_articles)} relevant articles. Deduplicating...")
    unique_articles = []
    seen_titles = []
    
    # Sort by date desc first (newest first)
    all_articles.sort(key=lambda x: x['published'], reverse=True)
    
    for article in all_articles:
        is_dup = False
        for seen in seen_titles:
            # Check title similarity > 0.8
            if similar(article['headline'].lower(), seen.lower()) > 0.8:
                is_dup = True
                break
        
        if not is_dup:
            unique_articles.append(article)
            seen_titles.append(article['headline'])
            
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
