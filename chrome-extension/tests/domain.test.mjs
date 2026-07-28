import test from "node:test";
import assert from "node:assert/strict";

import {
  advanceReviewItem,
  createAttemptEvent,
  createInitialReviewItem,
  createReviewEvent,
  extractProblemSlug,
  getDueReviewItems,
  nextReminderAt,
  selectRandomProblem,
  sortEventsNewestFirst,
  statusForProblem,
  summarizeEvents,
  summarizeReviews
} from "../src/domain.js";

const problem = {
  slug: "two-sum",
  title: "Two Sum",
  rating: 1200.25,
  topics: ["Array", "Hash Table"]
};

test("extractProblemSlug recognizes only LeetCode problem URLs", () => {
  assert.equal(
    extractProblemSlug("https://leetcode.com/problems/two-sum/description/?envType=daily"),
    "two-sum"
  );
  assert.equal(
    extractProblemSlug("https://www.leetcode.com/problems/merge-k-sorted-lists/"),
    "merge-k-sorted-lists"
  );
  assert.equal(extractProblemSlug("https://leetcode.com/contest/weekly-contest-1"), null);
  assert.equal(extractProblemSlug("https://example.com/problems/two-sum/"), null);
  assert.equal(extractProblemSlug("not a url"), null);
});

test("createAttemptEvent normalizes a manual event", () => {
  const event = createAttemptEvent({
    problem,
    outcome: "solved",
    assistance: "hint",
    confidence: "hard",
    note: "  Use a complement map. O(n).  ",
    now: new Date("2026-07-28T12:00:00.000Z"),
    id: "event-1"
  });

  assert.deepEqual(event, {
    schemaVersion: 1,
    id: "event-1",
    slug: "two-sum",
    title: "Two Sum",
    rating: 1200.25,
    topics: ["Array", "Hash Table"],
    outcome: "solved",
    assistance: "hint",
    confidence: "hard",
    note: "Use a complement map. O(n).",
    source: "manual",
    occurredAt: "2026-07-28T12:00:00.000Z"
  });
});

test("createAttemptEvent rejects unsupported outcomes", () => {
  assert.throws(
    () => createAttemptEvent({ problem, outcome: "opened" }),
    /Unsupported outcome/
  );
});

test("summaries count distinct attempted and solved problems", () => {
  const events = [
    { slug: "two-sum", outcome: "attempted" },
    { slug: "two-sum", outcome: "solved" },
    { slug: "valid-parentheses", outcome: "attempted" },
    { slug: "", outcome: "solved" }
  ];

  assert.deepEqual(summarizeEvents(events), {
    attemptedCount: 2,
    solvedCount: 1,
    eventCount: 3
  });
  assert.equal(statusForProblem(events, "two-sum"), "solved");
  assert.equal(statusForProblem(events, "valid-parentheses"), "attempted");
  assert.equal(statusForProblem(events, "missing"), "not_started");
});

test("events are sorted newest first without mutating the input", () => {
  const events = [
    { id: "older", occurredAt: "2026-07-27T12:00:00.000Z" },
    { id: "newer", occurredAt: "2026-07-28T12:00:00.000Z" }
  ];

  assert.deepEqual(sortEventsNewestFirst(events).map((event) => event.id), [
    "newer",
    "older"
  ]);
  assert.equal(events[0].id, "older");
});

test("a solve schedules its first review one day later", () => {
  const solvedAt = new Date("2026-07-28T12:00:00.000Z");
  const review = createInitialReviewItem(problem, solvedAt);

  assert.equal(review.stage, 0);
  assert.equal(review.intervalDays, 1);
  assert.equal(review.dueAt, "2026-07-29T12:00:00.000Z");
  assert.equal(review.lapses, 0);
});

test("review grades adapt the next interval", () => {
  const initial = createInitialReviewItem(
    problem,
    new Date("2026-07-27T12:00:00.000Z")
  );
  const reviewedAt = new Date("2026-07-28T12:00:00.000Z");

  const again = advanceReviewItem(initial, "again", reviewedAt);
  const hard = advanceReviewItem(initial, "hard", reviewedAt);
  const good = advanceReviewItem(initial, "good", reviewedAt);
  const easy = advanceReviewItem(initial, "easy", reviewedAt);

  assert.equal(again.intervalDays, 1);
  assert.equal(again.lapses, 1);
  assert.equal(hard.intervalDays, 2);
  assert.equal(good.intervalDays, 3);
  assert.equal(easy.intervalDays, 7);
  assert.ok(Date.parse(again.dueAt) < Date.parse(good.dueAt));
  assert.ok(Date.parse(good.dueAt) < Date.parse(easy.dueAt));
  assert.equal(initial.lastReviewedAt, null);
});

test("review events retain the scheduling audit trail", () => {
  const reviewedAt = new Date("2026-07-28T12:00:00.000Z");
  const previousReview = createInitialReviewItem(
    problem,
    new Date("2026-07-27T12:00:00.000Z")
  );
  const nextReview = advanceReviewItem(previousReview, "good", reviewedAt);
  const event = createReviewEvent({
    problem,
    previousReview,
    nextReview,
    grade: "good",
    assistance: "none",
    now: reviewedAt,
    id: "review-1"
  });

  assert.equal(event.outcome, "reviewed");
  assert.equal(event.review.previousDueAt, previousReview.dueAt);
  assert.equal(event.review.nextDueAt, nextReview.dueAt);
  assert.equal(event.review.intervalDays, 3);
});

test("due review summaries separate due and upcoming items", () => {
  const now = new Date("2026-07-28T12:00:00.000Z");
  const reviews = [
    { slug: "overdue", dueAt: "2026-07-26T12:00:00.000Z" },
    { slug: "due", dueAt: "2026-07-28T12:00:00.000Z" },
    { slug: "upcoming", dueAt: "2026-07-30T12:00:00.000Z" }
  ];

  assert.deepEqual(
    getDueReviewItems(reviews, now).map((review) => review.slug),
    ["overdue", "due"]
  );
  assert.deepEqual(summarizeReviews(reviews, now), {
    dueCount: 2,
    overdueCount: 1,
    upcomingCount: 1,
    nextDueAt: "2026-07-30T12:00:00.000Z"
  });
});

test("random problem selection respects ELO and exclusions", () => {
  const catalog = [
    { slug: "low", rating: 1100 },
    { slug: "middle-a", rating: 1500 },
    { slug: "middle-b", rating: 1600 },
    { slug: "high", rating: 2100 }
  ];

  const selection = selectRandomProblem(catalog, {
    minRating: 1400,
    maxRating: 1800,
    excludedSlugs: new Set(["middle-a"]),
    random: () => 0.9
  });
  assert.equal(selection.problem.slug, "middle-b");
  assert.equal(selection.matchCount, 1);

  const empty = selectRandomProblem(catalog, {
    minRating: 3000,
    maxRating: 3500
  });
  assert.equal(empty.problem, null);
  assert.equal(empty.matchCount, 0);
});

test("daily reminders use the next local clock time and honor snooze", () => {
  const now = new Date(2026, 6, 28, 19, 0, 0);
  const next = nextReminderAt(now, "18:30");
  assert.equal(next.getDate(), 29);
  assert.equal(next.getHours(), 18);
  assert.equal(next.getMinutes(), 30);

  const snoozedUntil = new Date(2026, 6, 29, 21, 0, 0).toISOString();
  const snoozed = nextReminderAt(now, "18:30", snoozedUntil);
  assert.equal(snoozed.getTime(), Date.parse(snoozedUntil));
});
