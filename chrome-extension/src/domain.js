export const ASSISTANCE_VALUES = Object.freeze(["none", "hint", "solution"]);
export const CONFIDENCE_VALUES = Object.freeze(["again", "hard", "good", "easy"]);
export const OUTCOME_VALUES = Object.freeze(["attempted", "solved"]);

export function extractProblemSlug(urlValue) {
  try {
    const url = new URL(urlValue);
    if (url.hostname !== "leetcode.com" && url.hostname !== "www.leetcode.com") {
      return null;
    }

    const match = url.pathname.match(/^\/problems\/([^/]+)(?:\/|$)/);
    if (!match) {
      return null;
    }

    return decodeURIComponent(match[1]).trim().toLowerCase() || null;
  } catch {
    return null;
  }
}

export function createAttemptEvent({
  problem,
  outcome,
  assistance = "none",
  confidence = "good",
  note = "",
  now = new Date(),
  id = crypto.randomUUID()
}) {
  if (!problem?.slug || !problem?.title) {
    throw new TypeError("A catalog problem with a slug and title is required.");
  }
  if (!OUTCOME_VALUES.includes(outcome)) {
    throw new TypeError(`Unsupported outcome: ${outcome}`);
  }
  if (!ASSISTANCE_VALUES.includes(assistance)) {
    throw new TypeError(`Unsupported assistance value: ${assistance}`);
  }
  if (!CONFIDENCE_VALUES.includes(confidence)) {
    throw new TypeError(`Unsupported confidence value: ${confidence}`);
  }

  return {
    schemaVersion: 1,
    id,
    slug: problem.slug,
    title: problem.title,
    rating: Number.isFinite(problem.rating) ? problem.rating : null,
    topics: Array.isArray(problem.topics) ? [...problem.topics] : [],
    outcome,
    assistance,
    confidence,
    note: String(note).trim().slice(0, 1000),
    source: "manual",
    occurredAt: now.toISOString()
  };
}

export function summarizeEvents(events) {
  const attempted = new Set();
  const solved = new Set();
  let eventCount = 0;

  for (const event of events) {
    if (!event?.slug || !OUTCOME_VALUES.includes(event.outcome)) {
      continue;
    }
    eventCount += 1;
    attempted.add(event.slug);
    if (event.outcome === "solved") {
      solved.add(event.slug);
    }
  }

  return {
    attemptedCount: attempted.size,
    solvedCount: solved.size,
    eventCount
  };
}

export function statusForProblem(events, slug) {
  const relevant = events.filter((event) => event?.slug === slug);
  if (relevant.some((event) => event.outcome === "solved")) {
    return "solved";
  }
  if (relevant.some((event) => event.outcome === "attempted")) {
    return "attempted";
  }
  return "not_started";
}

export function sortEventsNewestFirst(events) {
  return [...events].sort(
    (left, right) =>
      Date.parse(right?.occurredAt || 0) - Date.parse(left?.occurredAt || 0)
  );
}
