const EVENTS_KEY = "raytrack.events";
const SETTINGS_KEY = "raytrack.settings";
const REVIEWS_KEY = "raytrack.reviews";

export const DEFAULT_SETTINGS = Object.freeze({
  schemaVersion: 2,
  lowPressureMode: true,
  remindersEnabled: false,
  reminderTime: "18:00",
  reminderSnoozedUntil: null,
  dailyReviewLimit: 5,
  eloMin: 1200,
  eloMax: 1800,
  preferUnsolved: true
});

export async function getEvents() {
  const result = await chrome.storage.local.get(EVENTS_KEY);
  return Array.isArray(result[EVENTS_KEY]) ? result[EVENTS_KEY] : [];
}

export async function appendEvent(event) {
  const events = await getEvents();
  if (events.some((existing) => existing.id === event.id)) {
    return events;
  }

  const nextEvents = [...events, event];
  await chrome.storage.local.set({ [EVENTS_KEY]: nextEvents });
  return nextEvents;
}

export async function getReviewItems() {
  const result = await chrome.storage.local.get(REVIEWS_KEY);
  return Array.isArray(result[REVIEWS_KEY]) ? result[REVIEWS_KEY] : [];
}

export async function appendSolveAndEnsureReview(event, initialReviewItem) {
  const result = await chrome.storage.local.get([EVENTS_KEY, REVIEWS_KEY]);
  const events = Array.isArray(result[EVENTS_KEY]) ? result[EVENTS_KEY] : [];
  const reviews = Array.isArray(result[REVIEWS_KEY]) ? result[REVIEWS_KEY] : [];
  const nextEvents = events.some((existing) => existing.id === event.id)
    ? events
    : [...events, event];
  const nextReviews = reviews.some((review) => review.slug === initialReviewItem.slug)
    ? reviews
    : [...reviews, initialReviewItem];

  await chrome.storage.local.set({
    [EVENTS_KEY]: nextEvents,
    [REVIEWS_KEY]: nextReviews
  });
  return { events: nextEvents, reviews: nextReviews };
}

export async function appendReviewAndUpdateSchedule(event, nextReviewItem) {
  const result = await chrome.storage.local.get([EVENTS_KEY, REVIEWS_KEY]);
  const events = Array.isArray(result[EVENTS_KEY]) ? result[EVENTS_KEY] : [];
  const reviews = Array.isArray(result[REVIEWS_KEY]) ? result[REVIEWS_KEY] : [];
  const nextEvents = events.some((existing) => existing.id === event.id)
    ? events
    : [...events, event];
  const nextReviews = [
    ...reviews.filter((review) => review.slug !== nextReviewItem.slug),
    nextReviewItem
  ];

  await chrome.storage.local.set({
    [EVENTS_KEY]: nextEvents,
    [REVIEWS_KEY]: nextReviews
  });
  return { events: nextEvents, reviews: nextReviews };
}

export async function getSettings() {
  const result = await chrome.storage.local.get(SETTINGS_KEY);
  return {
    ...DEFAULT_SETTINGS,
    ...(result[SETTINGS_KEY] || {})
  };
}

export async function saveSettings(updates) {
  const current = await getSettings();
  const next = {
    ...current,
    ...updates,
    schemaVersion: DEFAULT_SETTINGS.schemaVersion
  };
  await chrome.storage.local.set({ [SETTINGS_KEY]: next });
  return next;
}

export async function initializeStorage() {
  const result = await chrome.storage.local.get([
    EVENTS_KEY,
    SETTINGS_KEY,
    REVIEWS_KEY
  ]);
  const updates = {};

  if (!Array.isArray(result[EVENTS_KEY])) {
    updates[EVENTS_KEY] = [];
  }
  if (!result[SETTINGS_KEY]) {
    updates[SETTINGS_KEY] = DEFAULT_SETTINGS;
  } else {
    const migratedSettings = {
      ...DEFAULT_SETTINGS,
      ...result[SETTINGS_KEY],
      schemaVersion: DEFAULT_SETTINGS.schemaVersion
    };
    if (JSON.stringify(migratedSettings) !== JSON.stringify(result[SETTINGS_KEY])) {
      updates[SETTINGS_KEY] = migratedSettings;
    }
  }
  if (!Array.isArray(result[REVIEWS_KEY])) {
    updates[REVIEWS_KEY] = [];
  }
  if (Object.keys(updates).length > 0) {
    await chrome.storage.local.set(updates);
  }
}

export function subscribeToEvents(listener) {
  const handler = (changes, areaName) => {
    if (areaName === "local" && changes[EVENTS_KEY]) {
      listener(Array.isArray(changes[EVENTS_KEY].newValue) ? changes[EVENTS_KEY].newValue : []);
    }
  };

  chrome.storage.onChanged.addListener(handler);
  return () => chrome.storage.onChanged.removeListener(handler);
}

export function subscribeToReviewItems(listener) {
  const handler = (changes, areaName) => {
    if (areaName === "local" && changes[REVIEWS_KEY]) {
      listener(
        Array.isArray(changes[REVIEWS_KEY].newValue)
          ? changes[REVIEWS_KEY].newValue
          : []
      );
    }
  };

  chrome.storage.onChanged.addListener(handler);
  return () => chrome.storage.onChanged.removeListener(handler);
}

export function subscribeToSettings(listener) {
  const handler = (changes, areaName) => {
    if (areaName === "local" && changes[SETTINGS_KEY]) {
      listener({
        ...DEFAULT_SETTINGS,
        ...(changes[SETTINGS_KEY].newValue || {})
      });
    }
  };

  chrome.storage.onChanged.addListener(handler);
  return () => chrome.storage.onChanged.removeListener(handler);
}

export function createExportDocument(
  { events, reviews, settings },
  exportedAt = new Date()
) {
  return {
    product: "RayTrack for LeetCode",
    schemaVersion: 2,
    exportedAt: exportedAt.toISOString(),
    events,
    reviews,
    settings
  };
}
