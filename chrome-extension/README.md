# RayTrack for LeetCode

RayTrack is a local-first Chrome extension that shows estimated ZeroTrac
difficulty ratings on LeetCode problem pages, lets learners privately record
attempts and solves, schedules spaced-retrieval reviews, and recommends random
problems inside a learner-selected ELO range.

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

## Review schedule

A first solve schedules a review one day later. Completing reviews with the
Again, Hard, Good, or Easy confidence grade adapts the next interval using an
expanding 1, 3, 7, 14, 30, 60, 120, and 240-day sequence. Again returns the
problem to one day; Hard grows more slowly. Snoozing a notification does not
mark the review correct or change its due date.

Daily reminders are off by default. Learners choose the reminder time and queue
limit, and Chrome alarms are recreated whenever the browser starts. The
toolbar badge always shows the number of reviews currently due, independently
of whether system notifications are enabled.

## Permissions

- `alarms`: wakes the extension near the learner's chosen reminder time.
- `notifications`: shows an opt-in reminder only when reviews are due.
- `sidePanel`: hosts the tracker beside LeetCode.
- `storage`: persists learner-confirmed history locally.
- `https://leetcode.com/problems/*`: places the ELO pill on problem pages.

RayTrack does not request cookie, browsing-history, tab-history, or network
interception permissions.

## Manual test checklist

After reloading the unpacked extension:

1. Open the rated example above and confirm the on-page ELO pill appears.
2. Navigate between several LeetCode problems and confirm the side panel follows
   the current URL.
3. Mark a problem attempted or solved and confirm the originating LeetCode tab
   closes. A solve should also create an upcoming day-1 review.
4. Use **Test notification** under Reminder settings.
5. Pick narrow and broad ELO ranges, verify the match count, and open a result.
6. Try `https://leetcode.com/problems/two-sum/` and confirm it displays
   **Unrated** because it is absent from the ZeroTrac contest catalog.
7. Export data and confirm the JSON contains `events`, `reviews`, and `settings`.

## Data source

Estimated problem ratings are derived from the ZeroTrac LeetCode Problem Rating
dataset and retain the MIT attribution documented in the repository's
`THIRD_PARTY_NOTICES.md`.
