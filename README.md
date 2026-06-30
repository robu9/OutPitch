# Outpitch

AI-powered job outreach platform. Find companies hiring for your role, discover founder and recruiter contacts, and send personalized emails — powered by persistent memory (Cognee), Gemini, and Composio integrations.

## Architecture

- **Frontend**: Next.js 16 (App Router) + Clerk auth + Tailwind
- **Backend**: Node.js/TypeScript Express API
- **Memory**: Self-hosted Cognee (remember / recall / improve / forget)
- **Integrations**: Composio (LinkedIn + Gmail), SerpAPI, Apollo.io, Google Gemini

## Prerequisites

- Node.js 20+
- Docker & Docker Compose
- API keys: Clerk, Gemini, Composio, SerpAPI, Apollo (optional for fallback)

## Quick Start

### 1. Clone and install

```bash
cd OutCast
cp .env.example .env
# Fill in your API keys in .env

npm install
```

### 2. Start infrastructure

```bash
docker compose -f docker/docker-compose.yml up -d
```

This starts Postgres (5432), Redis (6379), and Cognee (8000).

### 3. Database setup

```bash
npm run db:generate
npm run db:push
```

### 4. Build shared packages

```bash
npm run build --workspace=@outpitch/types
npm run build --workspace=@outpitch/db
```

### 5. Run development servers

```bash
npm run dev
```

- Web: http://localhost:3000
- API: http://localhost:4000

## Environment Variables

| Variable | Description |
|----------|-------------|
| `CLERK_SECRET_KEY` | Clerk backend secret |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | Clerk frontend key |
| `CLERK_WEBHOOK_SECRET` | Clerk webhook signing secret |
| `GEMINI_API_KEY` | Google Gemini API key |
| `COGNEE_API_URL` | Cognee API URL (default: http://localhost:8000) |
| `COGNEE_SERVICE_TOKEN` | Cognee service auth token |
| `COMPOSIO_API_KEY` | Composio API key |
| `SERPAPI_KEY` | SerpAPI key for company search |
| `APOLLO_API_KEY` | Apollo.io key for email fallback |
| `DATABASE_URL` | PostgreSQL connection string |
| `REDIS_URL` | Redis connection string |

## User Flow

1. **Sign in** with LinkedIn via Clerk
2. **Onboarding**: Connect Gmail via Composio, set target role and preferences
3. **Chat**: Ask Outpitch to find companies, draft emails, track outreach
4. **Companies**: View discovered companies with contacts and match scores
5. **Outreach**: Track sent emails and replies

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/health` | Health check |
| POST | `/api/auth/clerk` | Clerk webhook |
| GET | `/api/onboarding/status` | Connection status |
| POST | `/api/onboarding/complete` | Complete onboarding |
| POST | `/api/chat` | SSE chat stream |
| GET | `/api/companies` | List discovered companies |
| POST | `/api/companies/search` | Trigger company search pipeline |
| GET | `/api/outreach` | List outreach campaigns |
| POST | `/api/outreach/send` | Send email via Composio Gmail |

## Company Discovery Pipeline

1. **SerpAPI** searches for companies hiring the target role
2. **Website crawler** extracts company context and emails from /about, /team, /careers
3. **Cognee** stores company knowledge in shared `company_{id}` datasets
4. **Apollo.io** enriches contacts when crawl finds no email (fallback)
5. Results linked to user via `UserCompanyLink` with match scores

## Memory (Cognee)

Each user gets a `user_{clerkId}` dataset. Companies get shared `company_{id}` datasets. The Gemini agent uses all four Cognee verbs:

- **remember** — ingest profiles, crawl data, chat facts
- **recall** — retrieve context before recommendations
- **improve** — refine matching from user feedback
- **forget** — remove outdated topics

## Clerk Setup

1. Create a Clerk application at https://clerk.com
2. Enable LinkedIn OAuth provider
3. Set sign-in/sign-up redirect URLs to your app
4. Add webhook endpoint: `POST {API_URL}/api/auth/clerk` for `user.created` and `user.updated`

## Composio Setup

1. Create account at https://composio.dev
2. Enable LinkedIn and Gmail toolkits
3. Users connect Gmail during onboarding (OAuth handled by Composio)

## Integration Test Flow

1. Start docker compose and dev servers
2. Sign in with LinkedIn at http://localhost:3000
3. Complete onboarding with a target role
4. In chat, say: "Find frontend engineer roles at AI startups"
5. Check Companies page for results
6. Ask chat to draft an email for a contact
7. Confirm send (requires Gmail connected via Composio)

## Project Structure

```
OutCast/
├── apps/
│   ├── api/          # Express API + Gemini agent + pipelines
│   └── web/          # Next.js frontend
├── packages/
│   ├── types/        # Shared Zod schemas
│   └── db/           # Prisma schema + client
├── docker/
│   └── docker-compose.yml
└── README.md
```
