# The Hills Ledger

A production-ready decision-support platform for monitoring events, alerts, and development projects in the Hollywood Hills area. Features a modern dashboard and a powerful terminal interface for data exploration.

## Features

- **Dashboard**: Clean, premium interface showing today's top events, recent alerts, and active projects
- **Terminal**: Command-line interface for power users with advanced querying capabilities
- **Real-time Data Ingestion**: Automated pipeline pulling from multiple public data sources:

  - National Weather Service (API - includes fire weather warnings)
  - LA Department of Building & Safety Permits (Socrata API)
- **Admin Interface**: `/admin/ingest` page for manual ingestion triggers and debugging
- **Smart Geofencing**: Filters events to the Hollywood Hills area using bounding box coordinates
- **Event Classification**: Categorizes events by type (FIRE, FIRE_WEATHER, WEATHER, CLOSURE, PURSUIT, CRIME, PERMIT, OTHER)
- **Impact Scoring**: Ranks events by impact level (0-5) for prioritization
- **Verification System**: Tracks source reliability (VERIFIED, SINGLE_SOURCE, UNVERIFIED)

## Tech Stack

- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS + shadcn/ui components
- **Database**: Supabase (PostgreSQL)
- **Authentication**: None (v0 - decision support tool)

## Project Structure

```
.
├── app/
│   ├── api/                    # API route handlers
│   │   ├── status/            # System status
│   │   ├── events/            # Event queries
│   │   ├── alerts/            # Alert queries
│   │   ├── projects/          # Project queries
│   │   ├── project/[id]/      # Single project detail
│   │   └── ingest/run/        # Manual ingestion trigger
│   ├── page.tsx               # Dashboard (home page)
│   ├── terminal/page.tsx      # Terminal interface
│   ├── layout.tsx             # Root layout
│   └── globals.css            # Global styles
├── components/
│   ├── Terminal.tsx           # Terminal UI component
│   ├── EventCard.tsx          # Event display card
│   ├── ProjectCard.tsx        # Project display card
│   └── ui/                    # shadcn/ui components
├── lib/
│   ├── supabase/
│   │   ├── server.ts          # Server-side Supabase client
│   │   └── browser.ts         # Browser-side Supabase client
│   ├── types/
│   │   └── database.ts        # TypeScript type definitions
│   ├── terminal/
│   │   ├── parse.ts           # Command parser
│   │   └── commands.ts        # Command execution logic
│   └── ingest/
│       ├── types.ts           # Ingestion type definitions
│       ├── utils.ts           # Helper functions (geofencing, text processing)
│       ├── index.ts           # Provider registry
│       └── providers/
│           ├── lafd.ts        # LAFD RSS ingestion
│           ├── nws.ts         # NWS API ingestion
│           └── ladbs.ts       # LADBS Socrata API ingestion
└── .env                       # Environment variables
```

## Local Setup

### Prerequisites

- Node.js 18+ and npm
- A Supabase account and project

### 1. Clone the Repository

```bash
git clone <repository-url>
cd hills-ledger
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Configure Environment Variables

The `.env` file should contain:

```env
NEXT_PUBLIC_SUPABASE_URL=<your-supabase-url>
NEXT_PUBLIC_SUPABASE_ANON_KEY=<your-anon-key>
INGEST_KEY=hills-ledger-ingest-key-2024
```

**Note**: The database schema and seed data have already been applied to the Supabase instance.

### 4. Run the Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to view the dashboard.

### 5. Access the Terminal

Navigate to [http://localhost:3000/terminal](http://localhost:3000/terminal) to use the command-line interface.

### 6. Access the Admin Interface

Navigate to [http://localhost:3000/admin/ingest](http://localhost:3000/admin/ingest) to:
- Manually trigger ingestion for each provider
- Debug parse results without inserting to database
- View recent ingestion run history with status and error details

## Database Schema

The application uses the following tables:

- **areas**: Geographic regions (Hollywood Hills)
- **sources**: Data sources for ingestion
- **events**: Core event records
- **projects**: Development and permit projects
- **ingest_runs**: Ingestion pipeline execution logs
- **watchlists**: User watchlist terms (future feature)

All tables have Row Level Security (RLS) enabled with public read access for v0.

## Terminal Commands

### Basic Commands

```bash
help                              # Display help message
status                            # Show system status
clear                             # Clear terminal screen
```

### Event Queries

```bash
events --area=hollywood-hills --days=7 --limit=10
events --type=FIRE --days=14
events --area=hollywood-hills --days=30 --type=WEATHER --limit=20
```

**Parameters**:
- `--area`: Area slug (default: hollywood-hills)
- `--days`: Number of days to look back (default: 7)
- `--type`: Event type filter (FIRE, FIRE_WEATHER, WEATHER, CLOSURE, PURSUIT, CRIME, PERMIT, OTHER)
- `--limit`: Maximum results (default: 10)

### Alert Queries

```bash
alerts --days=7 --limit=10
alerts --level=CRITICAL
alerts --area=hollywood-hills --days=14 --level=ADVISORY
```

**Parameters**:
- `--area`: Area slug (default: hollywood-hills)
- `--days`: Number of days to look back (default: 7)
- `--level`: Alert level filter (INFO, ADVISORY, CRITICAL)
- `--limit`: Maximum results (default: 10)

Alerts are events filtered to types: FIRE, FIRE_WEATHER, WEATHER, CLOSURE, PURSUIT

### Project Queries

```bash
projects --days=30 --limit=10
projects --area=hollywood-hills --days=60
```

**Parameters**:
- `--area`: Area slug (default: hollywood-hills)
- `--days`: Number of days to look back (default: 30)
- `--limit`: Maximum results (default: 10)

### Project Detail

```bash
project <project-id>
```

### Manual Ingestion

```bash
ingest --provider=nws --area=hollywood-hills
ingest --provider=lafd
ingest --provider=ladbs
```

**Note**: Ingestion requires authentication. When prompted, enter the ingest key from your `.env` file.

## API Routes

All API routes return JSON responses.

### GET /api/status

Returns system status, active sources, and last update time.

```bash
curl http://localhost:3000/api/status
```

### GET /api/events

Query events with filters.

```bash
curl "http://localhost:3000/api/events?area=hollywood-hills&days=7&type=FIRE&limit=10"
```

### GET /api/alerts

Query alerts with filters.

```bash
curl "http://localhost:3000/api/alerts?area=hollywood-hills&days=7&level=CRITICAL&limit=10"
```

### GET /api/projects

Query projects with filters.

```bash
curl "http://localhost:3000/api/projects?area=hollywood-hills&days=30&limit=10"
```

### GET /api/project/[id]

Get detailed information about a specific project.

```bash
curl http://localhost:3000/api/project/<project-id>
```

### POST /api/ingest/run

Manually trigger data ingestion.

```bash
curl -X POST "http://localhost:3000/api/ingest/run?provider=nws&area=hollywood-hills" \
  -H "x-ingest-key: hills-ledger-ingest-key-2024"
```

**Parameters**:
- `provider`: One of `lafd`, `nws`, or `ladbs`
- `area`: Area slug (default: hollywood-hills)

**Headers**:
- `x-ingest-key`: Must match `INGEST_KEY` environment variable

### GET /api/ingest/debug

Test provider parsing without inserting to database (useful for debugging).

```bash
curl "http://localhost:3000/api/ingest/debug?provider=nws&area=hollywood-hills"
```

**Parameters**:
- `provider`: One of `lafd`, `nws`, or `ladbs`
- `area`: Area slug (default: hollywood-hills)

**Response**:
```json
{
  "ok": true,
  "provider": "nws",
  "source_url": "https://api.weather.gov/alerts/active?area=CA",
  "fetched_count": 42,
  "parsed_sample": [...],
  "raw_sample": [...]
}
```

### GET /api/ingest/runs

View recent ingestion run history.

```bash
curl "http://localhost:3000/api/ingest/runs?area=hollywood-hills&limit=20"
```

**Parameters**:
- `area`: Area slug (default: hollywood-hills)
- `limit`: Maximum results (default: 50)

## Ingestion Pipeline

The ingestion pipeline automatically fetches data from public sources and normalizes it into the database.

### Providers

1. **NWS (API)**: National Weather Service alerts
   - Fetches from api.weather.gov/alerts/active
   - Geofenced to Los Angeles County / Southern California
   - Classifies fire weather alerts separately:
     - **FIRE_WEATHER**: Red Flag Warnings, Wind Warnings, Santa Ana events
     - **WEATHER**: Other weather alerts (storms, fog, etc.)
   - Verified source with proper User-Agent header
   - Impact based on severity levels

2. **LADBS (Socrata)**: Building & Safety permits
   - Geofenced using lat/lng bounding box
   - Info level by default
   - Recent permits only (last 14 days)
   - Filtered to Hollywood Hills area

### Deduplication

The system checks for existing events with the same source, title, and date before inserting to prevent duplicates.

### Geofencing

Events are filtered to the Hollywood Hills area using:
- **Bounding box**: Lat/lng coordinates (34.077 to 34.152, -118.392 to -118.298)
- **Keyword matching**: For text-only sources (Mulholland, Laurel Canyon, Nichols Canyon, Runyon, etc.)

## How to Run Live Ingestion

To pull real data from external sources, use the ingestion API endpoint:

### NWS Weather Alerts (recommended to test first)

```bash
curl -X POST "http://localhost:3000/api/ingest/run?provider=nws&area=hollywood-hills" \
  -H "x-ingest-key: hills-ledger-ingest-key-2024"
```

### LAFD Fire Alerts

```bash
curl -X POST "http://localhost:3000/api/ingest/run?provider=lafd&area=hollywood-hills" \
  -H "x-ingest-key: hills-ledger-ingest-key-2024"
```

### LADBS Building Permits

```bash
curl -X POST "http://localhost:3000/api/ingest/run?provider=ladbs&area=hollywood-hills" \
  -H "x-ingest-key: hills-ledger-ingest-key-2024"
```

### Verify Ingestion Worked

Check the status endpoint to see ingestion results:

```bash
curl http://localhost:3000/api/status
```

Response includes:
- `sources_active`: Number of active data sources
- `last_ingest`: Details of the most recent ingestion run
- `last_event_time`: Most recent event timestamp
- `total_events`: Total number of events in database
- `recent_ingests`: Last 5 ingestion runs with stats

### Expected Response

Successful ingestion returns:
```json
{
  "success": true,
  "provider": "nws",
  "area": "hollywood-hills",
  "fetched": 150,
  "inserted": 5
}
```

If an error occurs:
```json
{
  "success": false,
  "provider": "nws",
  "area": "hollywood-hills",
  "fetched": 0,
  "inserted": 0,
  "error": "HTTP 403: Forbidden - User-Agent required"
}
```

## Build for Production

```bash
npm run build
```

This creates an optimized production build in the `.next` directory.

## Deploy to GitHub

1. Create a new GitHub repository
2. Initialize git and push:

```bash
git init
git add .
git commit -m "Initial commit: The Hills Ledger"
git branch -M main
git remote add origin <your-github-repo-url>
git push -u origin main
```

## Deploy to Production

The app can be deployed to any platform that supports Next.js:

- **Vercel** (recommended): Connect your GitHub repo for automatic deployments
- **Netlify**: Configured with `netlify.toml`
- **Other platforms**: Follow their Next.js deployment guides

**Important**: Set environment variables in your deployment platform:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `INGEST_KEY`

## Security Considerations

- No exact addresses are displayed in the UI (only coarse location labels)
- Service role key is server-only (never exposed to browser)
- Ingestion endpoint requires shared secret authentication
- RLS policies ensure data access control

## Future Enhancements

- User authentication and personalized watchlists
- Real-time WebSocket updates
- Email/SMS notifications for critical alerts
- Historical trend analysis
- Mobile app
- Additional data sources

## License

MIT

## Disclaimer

This is a decision-support tool. For emergencies, always follow official channels. Data sources may vary in reliability and timeliness.
