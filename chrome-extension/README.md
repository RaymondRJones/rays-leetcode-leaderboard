# RayTrack for LeetCode

RayTrack is a local-first Chrome extension that shows estimated ZeroTrac
difficulty ratings on LeetCode problem pages and lets learners privately record
attempts and solves.

This first milestone deliberately does not read LeetCode cookies, source code,
problem statements, or submission responses. It identifies the current problem
from the URL and treats learner-confirmed outcomes as the source of truth.

## Build and verify

From this directory:

```bash
npm run check
```

`build:catalog` transforms the leaderboard's
`leetcode-elo/public/problems_with_categories.json` into the compact extension
asset at `assets/problem-catalog.json`.

## Load unpacked

1. Open `chrome://extensions`.
2. Enable **Developer mode**.
3. Select **Load unpacked**.
4. Choose this `chrome-extension` directory.
5. Open a rated URL such as
   `https://leetcode.com/problems/minimum-number-of-operations-to-make-elements-in-array-distinct/`.
6. Click the RayTrack ELO pill on the page or the extension toolbar action to
   open the side panel.

All practice events are stored in `chrome.storage.local` and are removed when
the extension is uninstalled. Use **Export data** in the side panel to create a
portable JSON backup.

## Permissions

- `sidePanel`: hosts the tracker beside LeetCode.
- `storage`: persists learner-confirmed history locally.
- `https://leetcode.com/problems/*`: places the ELO pill on problem pages.

RayTrack does not request cookie, browsing-history, tab-history, or network
interception permissions.

## Data source

Estimated problem ratings are derived from the ZeroTrac LeetCode Problem Rating
dataset and retain the MIT attribution documented in the repository's
`THIRD_PARTY_NOTICES.md`.
