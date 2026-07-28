import test from "node:test";
import assert from "node:assert/strict";

import {
  appendReviewAndUpdateSchedule,
  appendSolveAndEnsureReview,
  createExportDocument,
  getReviewItems,
  getSettings,
  initializeStorage
} from "../src/storage.js";

test("storage initialization migrates v1 settings and creates a review collection", async () => {
  const store = installChromeStorageMock({
    "raytrack.events": [],
    "raytrack.settings": {
      schemaVersion: 1,
      lowPressureMode: false
    }
  });

  await initializeStorage();
  const settings = await getSettings();

  assert.equal(settings.schemaVersion, 2);
  assert.equal(settings.lowPressureMode, false);
  assert.equal(settings.remindersEnabled, false);
  assert.equal(settings.reminderTime, "18:00");
  assert.deepEqual(await getReviewItems(), []);
  assert.deepEqual(store["raytrack.reviews"], []);
});

test("solve and review commits update event history and schedule idempotently", async () => {
  const store = installChromeStorageMock({
    "raytrack.events": [],
    "raytrack.reviews": []
  });
  const solveEvent = {
    id: "solve-1",
    slug: "two-sum",
    outcome: "solved"
  };
  const initialReview = {
    slug: "two-sum",
    dueAt: "2026-07-29T12:00:00.000Z",
    intervalDays: 1
  };

  await appendSolveAndEnsureReview(solveEvent, initialReview);
  await appendSolveAndEnsureReview(solveEvent, initialReview);
  assert.equal(store["raytrack.events"].length, 1);
  assert.equal(store["raytrack.reviews"].length, 1);

  const reviewEvent = {
    id: "review-1",
    slug: "two-sum",
    outcome: "reviewed"
  };
  const nextReview = {
    ...initialReview,
    dueAt: "2026-08-01T12:00:00.000Z",
    intervalDays: 3
  };
  await appendReviewAndUpdateSchedule(reviewEvent, nextReview);
  await appendReviewAndUpdateSchedule(reviewEvent, nextReview);

  assert.deepEqual(
    store["raytrack.events"].map((event) => event.id),
    ["solve-1", "review-1"]
  );
  assert.deepEqual(store["raytrack.reviews"], [nextReview]);
});

test("exports include review schedules and reminder settings", () => {
  const exported = createExportDocument(
    {
      events: [{ id: "event-1" }],
      reviews: [{ slug: "two-sum" }],
      settings: { remindersEnabled: true }
    },
    new Date("2026-07-28T12:00:00.000Z")
  );

  assert.equal(exported.schemaVersion, 2);
  assert.equal(exported.exportedAt, "2026-07-28T12:00:00.000Z");
  assert.equal(exported.events.length, 1);
  assert.equal(exported.reviews.length, 1);
  assert.equal(exported.settings.remindersEnabled, true);
});

function installChromeStorageMock(initial) {
  const store = structuredClone(initial);
  globalThis.chrome = {
    storage: {
      local: {
        async get(keys) {
          const requested = Array.isArray(keys) ? keys : [keys];
          return Object.fromEntries(
            requested
              .filter((key) => Object.hasOwn(store, key))
              .map((key) => [key, structuredClone(store[key])])
          );
        },
        async set(updates) {
          Object.assign(store, structuredClone(updates));
        }
      },
      onChanged: {
        addListener() {},
        removeListener() {}
      }
    }
  };
  return store;
}
