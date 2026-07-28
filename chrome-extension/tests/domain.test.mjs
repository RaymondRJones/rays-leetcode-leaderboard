import test from "node:test";
import assert from "node:assert/strict";

import {
  createAttemptEvent,
  extractProblemSlug,
  sortEventsNewestFirst,
  statusForProblem,
  summarizeEvents
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
