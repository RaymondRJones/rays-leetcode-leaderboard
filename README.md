# Ray's DSA Leaderboard

A React web app that tracks LeetCode ELO ratings and GitHub contributions for a group of users competing in coding challenges.

## How It Works

### Data Storage — Cloudflare Workers KV

User and leaderboard data lives in **Cloudflare Workers KV**, accessed through a Cloudflare Worker at:

```
https://weathered-dream-8f83.rayjones2170.workers.dev
```

Both the frontend and the Python data pipeline talk to this Worker. Public leaderboard reads are allowed, but writes are handled server-side by the Worker.

**KV keys:**

| Key | Contents |
|-----|----------|
| `leetcode:data` | Full leaderboard (ELO, problem counts, weekly history per user) |
| `github:data` | GitHub contribution data per user |
| `users:list` | Registered users (LeetCode username, GitHub username, display name) |

### Frontend (`leetcode-elo/`)

React + MUI app. Pages:

- `/` — Leaderboard ranked by problems solved this month, with ELO and rating change indicators. Click a user to see their progress graph.
- `/zerotrac` — LeetCode problems searchable and filterable by ELO rating
- `/categories` — ~2000 problems browsable by category
- `/github` — GitHub contribution history
- `/register` — Register new users through the Worker `/register` endpoint
- `/calculator` — LeetCode T-shirt coin calculator

### Data Pipeline (`query_scripts/`)

Python scripts that fetch fresh data and push it to KV:

- `query_users_elo_daily.py` — fetches ELO and problem counts from the LeetCode GraphQL API
- `get_leetcode_users_elo_problems_solved.py` — broader stats fetching
- `kv_client.py` — shared helper for reading/writing KV via the Worker
- `weekly_update_users_elo.sh` — shell script to run the weekly update

## Running Locally

Node version: `v20.5.1`

```bash
cd leetcode-elo
npm install
npm start
```

The app will open at `http://localhost:3000` and load live data from the Cloudflare Worker.

## Adding New Users

### Via the `/register` page

Fill out the form with a LeetCode username, GitHub username, and optional display name. The browser submits to the Cloudflare Worker `/register` endpoint; the Worker verifies the LeetCode and GitHub profiles, rate-limits submissions, checks duplicates against KV, and appends the user to `users:list`. They will appear on the leaderboard after the next automated data update.

### Via Python script

```bash
cd query_scripts
python3 add_users_to_json.py
```

## Environment Variables

| Variable | Default | Purpose |
|----------|---------|---------|
| `REACT_APP_API_URL` | `https://weathered-dream-8f83.rayjones2170.workers.dev` | Cloudflare Worker URL |
| `REACT_APP_TURNSTILE_SITE_KEY` | empty | Optional Cloudflare Turnstile site key for the registration form |
| `WORKER_URL` | same as above | Used by Python scripts (via `.env`) |
| `KV_ADMIN_TOKEN` | empty | Bearer token used by Python scripts for admin KV reads/writes |

## Cloudflare Worker

Worker source lives in `cloudflare-worker/`.

```bash
cd cloudflare-worker
cp wrangler.toml.example wrangler.toml
wrangler secret put ADMIN_API_TOKEN
wrangler secret put TURNSTILE_SECRET_KEY
wrangler deploy
```

Set the same `ADMIN_API_TOKEN` value as `KV_ADMIN_TOKEN` in the Python pipeline environment. `TURNSTILE_SECRET_KEY` is optional, but recommended for production self-registration.
