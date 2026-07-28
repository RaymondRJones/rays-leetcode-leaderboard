const EVENTS_KEY = "raytrack.events";
const SETTINGS_KEY = "raytrack.settings";

export const DEFAULT_SETTINGS = Object.freeze({
  schemaVersion: 1,
  lowPressureMode: true
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

export async function getSettings() {
  const result = await chrome.storage.local.get(SETTINGS_KEY);
  return {
    ...DEFAULT_SETTINGS,
    ...(result[SETTINGS_KEY] || {})
  };
}

export async function initializeStorage() {
  const result = await chrome.storage.local.get([EVENTS_KEY, SETTINGS_KEY]);
  const updates = {};

  if (!Array.isArray(result[EVENTS_KEY])) {
    updates[EVENTS_KEY] = [];
  }
  if (!result[SETTINGS_KEY]) {
    updates[SETTINGS_KEY] = DEFAULT_SETTINGS;
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

export function createExportDocument(events, exportedAt = new Date()) {
  return {
    product: "RayTrack for LeetCode",
    schemaVersion: 1,
    exportedAt: exportedAt.toISOString(),
    events
  };
}
