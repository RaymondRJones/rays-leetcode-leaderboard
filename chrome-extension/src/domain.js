export const ASSISTANCE_VALUES = Object.freeze(["none", "hint", "solution"]);
export const CONFIDENCE_VALUES = Object.freeze(["again", "hard", "good", "easy"]);
export const OUTCOME_VALUES = Object.freeze(["attempted", "solved", "reviewed"]);
export const REVIEW_INTERVAL_DAYS = Object.freeze([1, 3, 7, 14, 30, 60, 120, 240]);

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

export function createInitialReviewItem(problem, solvedAt = new Date()) {
  if (!problem?.slug || !problem?.title) {
    throw new TypeError("A catalog problem with a slug and title is required.");
  }

  const dueAt = addDays(solvedAt, REVIEW_INTERVAL_DAYS[0]);
  return {
    schemaVersion: 1,
    slug: problem.slug,
    title: problem.title,
    rating: Number.isFinite(problem.rating) ? problem.rating : null,
    topics: Array.isArray(problem.topics) ? [...problem.topics] : [],
    stage: 0,
    intervalDays: REVIEW_INTERVAL_DAYS[0],
    dueAt: dueAt.toISOString(),
    lastReviewedAt: null,
    lastGrade: null,
    lapses: 0,
    createdAt: solvedAt.toISOString()
  };
}

export function advanceReviewItem(reviewItem, grade, reviewedAt = new Date()) {
  if (!reviewItem?.slug) {
    throw new TypeError("A review item with a slug is required.");
  }
  if (!CONFIDENCE_VALUES.includes(grade)) {
    throw new TypeError(`Unsupported review grade: ${grade}`);
  }

  const currentStage = clampInteger(reviewItem.stage, 0, REVIEW_INTERVAL_DAYS.length - 1);
  const currentInterval = Math.max(
    1,
    Number(reviewItem.intervalDays) || REVIEW_INTERVAL_DAYS[currentStage]
  );
  let nextStage = currentStage;
  let intervalDays;

  if (grade === "again") {
    nextStage = 0;
    intervalDays = REVIEW_INTERVAL_DAYS[0];
  } else if (grade === "hard") {
    intervalDays = Math.min(365, Math.ceil(currentInterval * 1.2));
  } else {
    const stageAdvance = grade === "easy" ? 2 : 1;
    nextStage = Math.min(
      REVIEW_INTERVAL_DAYS.length - 1,
      currentStage + stageAdvance
    );
    intervalDays =
      nextStage > currentStage
        ? REVIEW_INTERVAL_DAYS[nextStage]
        : Math.min(
            365,
            Math.ceil(currentInterval * (grade === "easy" ? 2.5 : 1.8))
          );
  }

  return {
    ...reviewItem,
    schemaVersion: 1,
    stage: nextStage,
    intervalDays,
    dueAt: addDays(reviewedAt, intervalDays).toISOString(),
    lastReviewedAt: reviewedAt.toISOString(),
    lastGrade: grade,
    lapses: Math.max(0, Number(reviewItem.lapses) || 0) + (grade === "again" ? 1 : 0)
  };
}

export function createReviewEvent({
  problem,
  previousReview,
  nextReview,
  assistance = "none",
  grade = "good",
  note = "",
  now = new Date(),
  id = crypto.randomUUID()
}) {
  if (!problem?.slug || !problem?.title) {
    throw new TypeError("A catalog problem with a slug and title is required.");
  }
  if (!previousReview?.dueAt || !nextReview?.dueAt) {
    throw new TypeError("Previous and next review schedules are required.");
  }
  if (!ASSISTANCE_VALUES.includes(assistance)) {
    throw new TypeError(`Unsupported assistance value: ${assistance}`);
  }
  if (!CONFIDENCE_VALUES.includes(grade)) {
    throw new TypeError(`Unsupported review grade: ${grade}`);
  }

  return {
    schemaVersion: 1,
    id,
    slug: problem.slug,
    title: problem.title,
    rating: Number.isFinite(problem.rating) ? problem.rating : null,
    topics: Array.isArray(problem.topics) ? [...problem.topics] : [],
    outcome: "reviewed",
    assistance,
    confidence: grade,
    note: String(note).trim().slice(0, 1000),
    source: "manual",
    review: {
      previousDueAt: previousReview.dueAt,
      nextDueAt: nextReview.dueAt,
      intervalDays: nextReview.intervalDays,
      stage: nextReview.stage,
      lapses: nextReview.lapses
    },
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
    if (event.outcome === "attempted" || event.outcome === "solved") {
      attempted.add(event.slug);
    }
    if (event.outcome === "solved" || event.outcome === "reviewed") {
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
  if (
    relevant.some(
      (event) => event.outcome === "solved" || event.outcome === "reviewed"
    )
  ) {
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

export function sortReviewsByDueDate(reviewItems) {
  return [...reviewItems].sort(
    (left, right) => Date.parse(left?.dueAt || 0) - Date.parse(right?.dueAt || 0)
  );
}

export function getDueReviewItems(reviewItems, now = new Date()) {
  const nowTime = now.getTime();
  return sortReviewsByDueDate(reviewItems).filter((item) => {
    const dueTime = Date.parse(item?.dueAt || "");
    return Number.isFinite(dueTime) && dueTime <= nowTime;
  });
}

export function summarizeReviews(reviewItems, now = new Date()) {
  const due = getDueReviewItems(reviewItems, now);
  const upcoming = reviewItems.filter((item) => {
    const dueTime = Date.parse(item?.dueAt || "");
    return Number.isFinite(dueTime) && dueTime > now.getTime();
  });
  const startOfToday = new Date(now);
  startOfToday.setHours(0, 0, 0, 0);

  return {
    dueCount: due.length,
    overdueCount: due.filter(
      (item) => Date.parse(item.dueAt) < startOfToday.getTime()
    ).length,
    upcomingCount: upcoming.length,
    nextDueAt: sortReviewsByDueDate(upcoming)[0]?.dueAt || null
  };
}

export function selectRandomProblem(
  problems,
  {
    minRating = Number.NEGATIVE_INFINITY,
    maxRating = Number.POSITIVE_INFINITY,
    excludedSlugs = new Set(),
    random = Math.random
  } = {}
) {
  const min = Number(minRating);
  const max = Number(maxRating);
  if (Number.isNaN(min) || Number.isNaN(max) || min > max) {
    throw new RangeError("ELO range must contain valid minimum and maximum values.");
  }

  const matches = problems.filter(
    (problem) =>
      Number.isFinite(problem?.rating) &&
      problem.rating >= min &&
      problem.rating <= max &&
      !excludedSlugs.has(problem.slug)
  );
  if (matches.length === 0) {
    return { problem: null, matchCount: 0 };
  }

  const rawRandomValue = Number(random());
  const randomValue = Number.isFinite(rawRandomValue)
    ? Math.max(0, Math.min(0.999999999999, rawRandomValue))
    : 0;
  return {
    problem: matches[Math.floor(randomValue * matches.length)],
    matchCount: matches.length
  };
}

export function nextReminderAt(
  now,
  reminderTime,
  reminderSnoozedUntil = null
) {
  const match = String(reminderTime || "").match(/^([01]\d|2[0-3]):([0-5]\d)$/);
  if (!match) {
    throw new TypeError("Reminder time must use 24-hour HH:MM format.");
  }

  const candidate = new Date(now);
  candidate.setHours(Number(match[1]), Number(match[2]), 0, 0);
  if (candidate.getTime() <= now.getTime()) {
    candidate.setDate(candidate.getDate() + 1);
  }

  const snoozedTime = Date.parse(reminderSnoozedUntil || "");
  if (Number.isFinite(snoozedTime) && snoozedTime > now.getTime()) {
    return new Date(Math.max(candidate.getTime(), snoozedTime));
  }
  return candidate;
}

function addDays(dateValue, days) {
  const date = new Date(dateValue);
  if (Number.isNaN(date.getTime())) {
    throw new TypeError("A valid date is required.");
  }
  date.setDate(date.getDate() + days);
  return date;
}

function clampInteger(value, min, max) {
  const number = Math.trunc(Number(value));
  if (!Number.isFinite(number)) {
    return min;
  }
  return Math.max(min, Math.min(max, number));
}
