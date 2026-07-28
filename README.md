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
| `registrations:pending` | Private queue of self-registration requests awaiting owner review |

### Frontend (`leetcode-elo/`)

React + MUI app. Pages:

- `/` — Leaderboard ranked by problems solved this month, with ELO and rating change indicators. Click a user to see their progress graph.
- `/zerotrac` — LeetCode problems searchable and filterable by ELO rating
- `/categories` — 2500+ rated problems browsable by category
- `/github` — GitHub contribution history
- `/register` — Submit a profile to the private moderation queue; GitHub username is optional
- `/calculator` — LeetCode T-shirt coin calculator
- `/privacy` — Privacy policy
- `/terms` — Terms of use

### Data Pipeline (`query_scripts/`)

Python scripts that fetch fresh data and push it to KV:

- `query_users_elo_daily.py` — fetches ELO and problem counts from the LeetCode GraphQL API
- `get_leetcode_users_elo_problems_solved.py` — broader stats fetching
- `initialize_new_users.py` — adds only registered users missing from the leaderboard, with a zero starting delta
- `initialize_monthly_baselines.py` — safely adds missing monthly baselines while preserving current scores
- `review_registrations.py` — privately lists, verifies, approves, or rejects pending registrations
- `remove_user.py` — permanently removes a user from registration and leaderboard data, with dry-run protection
- `kv_client.py` — shared helper for reading/writing KV via the Worker
- `weekly_update_users_elo.sh` — shell script to run the weekly update
- `sync_zerotrac_catalog.py` — merges the latest upstream ZeroTrac ratings with cached topic metadata into the single frontend problem catalog

Monthly scores use `month_start_problem_count` as a fixed baseline. Existing records derive this baseline from their current count and monthly delta, while new users start at zero monthly progress. The baseline advances only on the first day of a new month; weekly history snapshots do not reset it.

To initialize missing baselines without fetching LeetCode or changing current monthly scores:

```bash
cd query_scripts
python3 initialize_monthly_baselines.py --dry-run
python3 initialize_monthly_baselines.py
```

Profile fetch failures are handled conservatively. HTTP errors, malformed responses, and GraphQL errors preserve the existing user without adding a strike. After three confirmed `matchedUser: null` responses, the user is marked inactive and hidden from the public leaderboard while their history remains in KV. A later successful response automatically reactivates the profile.

### Updating the problem catalog

Both `/zerotrac` and `/categories` read
`leetcode-elo/public/problems_with_categories.json`. To merge a current checkout
of the upstream ZeroTrac repository while preserving all cached topic tags:

```bash
python3 query_scripts/sync_zerotrac_catalog.py --check
python3 query_scripts/sync_zerotrac_catalog.py
```

Pass `--source /path/to/data.json` when the ZeroTrac repository is not checked
out beside this repository. The sync rejects malformed data, duplicate problem
slugs, and unexpected catalog shrinkage.

To inspect topic coverage and incrementally enrich only uncategorized problems:

```bash
python3 query_scripts/fetch_problem_categories.py --status
python3 query_scripts/fetch_problem_categories.py
```

Use `--limit 10` for a small batch. Successful topic lookups are checkpointed
atomically, failed requests leave problems pending for a later retry, and
existing topic metadata is never refetched or overwritten.

Problem ratings are derived from the
[ZeroTrac LeetCode Problem Rating](https://github.com/zerotrac/leetcode_problem_rating)
dataset. See `THIRD_PARTY_NOTICES.md` for attribution and license details.

## RayTrack Chrome extension

`chrome-extension/` contains a local-first Manifest V3 extension that reveals
the packaged ZeroTrac rating on LeetCode problem pages and lets learners
privately record attempts and solves in a Chrome side panel.

```bash
cd chrome-extension
npm run check
```

After verification, load `chrome-extension/` through Chrome's **Load unpacked**
flow. See `chrome-extension/README.md` for permissions, privacy behavior, and
step-by-step installation instructions.

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

Fill out the form with a LeetCode username, optional GitHub username, and optional display name. The browser submits to the Cloudflare Worker `/register` endpoint; the Worker verifies submitted profiles, rate-limits submissions, checks duplicates against KV, and adds the request to the private `registrations:pending` queue. Submissions do not enter `users:list` or appear publicly until the site owner approves them.

Review pending submissions from `query_scripts/`:

```bash
python3 review_registrations.py list
python3 review_registrations.py approve LeetCodeUsername
python3 review_registrations.py approve LeetCodeUsername --yes
python3 review_registrations.py reject LeetCodeUsername
python3 review_registrations.py reject LeetCodeUsername --yes
```

Approval and rejection are dry runs unless `--yes` is provided. Approval reverifies the LeetCode profile, moves it to `users:list`, and leaves leaderboard initialization as a separate explicit step.

To add only newly registered users without changing any existing user's problem counts, ELO, or monthly delta:

```bash
cd query_scripts
python3 initialize_new_users.py --dry-run
python3 initialize_new_users.py
```

To permanently remove a registration and its leaderboard history, preview the change first and then confirm it explicitly:

```bash
cd query_scripts
python3 remove_user.py LeetCodeUsername
python3 remove_user.py LeetCodeUsername --yes
python3 remove_user.py FirstUsername SecondUsername --yes
```

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

After deployment, verify that the secured Worker is live:

```bash
curl https://your-worker.workers.dev/health
# {"ok":true}
```
