import { listProblems } from "./catalog.js";
import {
  advanceReviewItem,
  createAttemptEvent,
  createInitialReviewItem,
  createReviewEvent,
  getDueReviewItems,
  selectRandomProblem,
  sortEventsNewestFirst,
  statusForProblem,
  summarizeEvents,
  summarizeReviews
} from "./domain.js";
import {
  appendEvent,
  appendReviewAndUpdateSchedule,
  appendSolveAndEnsureReview,
  createExportDocument,
  getEvents,
  getReviewItems,
  getSettings,
  saveSettings,
  subscribeToEvents,
  subscribeToReviewItems,
  subscribeToSettings
} from "./storage.js";

const ACTIVE_CONTEXT_KEY = "raytrack.activeProblem";
const elements = {
  currentPanel: document.querySelector("#current-panel"),
  problemState: document.querySelector("#problem-state"),
  problemTitle: document.querySelector("#problem-title"),
  problemRating: document.querySelector("#problem-rating"),
  problemTopics: document.querySelector("#problem-topics"),
  problemStatus: document.querySelector("#problem-status"),
  assistance: document.querySelector("#assistance"),
  confidence: document.querySelector("#confidence"),
  note: document.querySelector("#note"),
  markAttempted: document.querySelector("#mark-attempted"),
  markSolved: document.querySelector("#mark-solved"),
  reviewAction: document.querySelector("#review-action"),
  currentReviewInfo: document.querySelector("#current-review-info"),
  completeReview: document.querySelector("#complete-review"),
  saveMessage: document.querySelector("#save-message"),
  eloMin: document.querySelector("#elo-min"),
  eloMax: document.querySelector("#elo-max"),
  preferUnsolved: document.querySelector("#prefer-unsolved"),
  pickProblem: document.querySelector("#pick-problem"),
  pickerMessage: document.querySelector("#picker-message"),
  pickedProblem: document.querySelector("#picked-problem"),
  pickedTitle: document.querySelector("#picked-title"),
  pickedRating: document.querySelector("#picked-rating"),
  pickedTopics: document.querySelector("#picked-topics"),
  openPickedProblem: document.querySelector("#open-picked-problem"),
  dueCount: document.querySelector("#due-count"),
  reviewSummary: document.querySelector("#review-summary"),
  reviewList: document.querySelector("#review-list"),
  reviewEmpty: document.querySelector("#review-empty"),
  remindersEnabled: document.querySelector("#reminders-enabled"),
  reminderTime: document.querySelector("#reminder-time"),
  dailyReviewLimit: document.querySelector("#daily-review-limit"),
  saveReminders: document.querySelector("#save-reminders"),
  testReminder: document.querySelector("#test-reminder"),
  reminderMessage: document.querySelector("#reminder-message"),
  solvedCount: document.querySelector("#solved-count"),
  attemptedCount: document.querySelector("#attempted-count"),
  eventCount: document.querySelector("#event-count"),
  historyList: document.querySelector("#history-list"),
  historyEmpty: document.querySelector("#history-empty"),
  exportData: document.querySelector("#export-data")
};

let currentContext = null;
let events = [];
let reviewItems = [];
let settings = null;
let pickedProblem = null;

async function initialize() {
  [events, reviewItems, settings] = await Promise.all([
    getEvents(),
    getReviewItems(),
    getSettings()
  ]);
  populateSettings();
  renderAll();
  await refreshCurrentProblem();

  subscribeToEvents((nextEvents) => {
    events = nextEvents;
    renderAll();
  });
  subscribeToReviewItems((nextReviewItems) => {
    reviewItems = nextReviewItems;
    renderReviews();
    renderCurrentReview();
  });
  subscribeToSettings((nextSettings) => {
    settings = nextSettings;
    populateSettings();
    renderReviews();
  });

  chrome.storage.onChanged.addListener((changes, areaName) => {
    if (areaName === "session" && changes[ACTIVE_CONTEXT_KEY]) {
      currentContext = changes[ACTIVE_CONTEXT_KEY].newValue || null;
      renderCurrentProblem();
    }
  });
}

async function refreshCurrentProblem() {
  const response = await chrome.runtime.sendMessage({ type: "problem.current" });
  currentContext = response?.ok ? response.context : null;
  renderCurrentProblem();
}

function renderAll() {
  renderSummary();
  renderHistory();
  renderProblemStatus();
  renderCurrentReview();
  renderReviews();
}

function renderCurrentProblem() {
  const problem = currentContext?.problem;
  const slug = currentContext?.slug;

  elements.currentPanel.hidden = !(problem || slug);
  if (!problem && !slug) {
    elements.reviewAction.hidden = true;
    return;
  }

  elements.problemTitle.textContent = problem?.title || titleFromSlug(slug);
  elements.problemRating.textContent = Number.isFinite(problem?.rating)
    ? `ELO ${Math.round(problem.rating).toLocaleString()}`
    : "Unrated";
  renderTopicChips(elements.problemTopics, problem?.topics || []);
  renderProblemStatus();
  renderCurrentReview();
}

function renderProblemStatus() {
  if (!currentContext?.slug) {
    return;
  }

  const status = statusForProblem(events, currentContext.slug);
  const labels = {
    not_started: "Not tracked yet",
    attempted: "Previously attempted",
    solved: "Previously solved"
  };
  elements.problemStatus.textContent = labels[status];
}

function renderCurrentReview() {
  const review = reviewItems.find((item) => item.slug === currentContext?.slug);
  elements.reviewAction.hidden = !review;
  elements.markSolved.textContent = review
    ? "Solved again & close"
    : "Solved & close";
  if (!review) {
    return;
  }

  const due = Date.parse(review.dueAt) <= Date.now();
  elements.currentReviewInfo.textContent = due
    ? "This review is due. Grade your recall to advance its schedule."
    : `Next review is ${formatDueDate(review.dueAt)}. You may complete it early.`;
}

function renderSummary() {
  const summary = summarizeEvents(events);
  elements.solvedCount.textContent = summary.solvedCount.toLocaleString();
  elements.attemptedCount.textContent = summary.attemptedCount.toLocaleString();
  elements.eventCount.textContent = summary.eventCount.toLocaleString();
}

function renderReviews() {
  if (!settings) {
    return;
  }

  const now = new Date();
  const summary = summarizeReviews(reviewItems, now);
  const due = getDueReviewItems(reviewItems, now);
  const limit = Math.max(1, Number(settings.dailyReviewLimit) || 5);
  const visible = due.slice(0, limit);

  elements.dueCount.textContent = `${summary.dueCount} due`;
  elements.dueCount.classList.toggle("has-due", summary.dueCount > 0);
  elements.reviewEmpty.hidden = reviewItems.length > 0;

  if (summary.dueCount > 0) {
    elements.reviewSummary.textContent =
      summary.dueCount > visible.length
        ? `Showing ${visible.length} of ${summary.dueCount} due reviews to keep the queue manageable.`
        : `${summary.overdueCount} overdue · ${summary.upcomingCount} upcoming`;
  } else if (summary.nextDueAt) {
    elements.reviewSummary.textContent = `Next review ${formatDueDate(summary.nextDueAt)}.`;
  } else {
    elements.reviewSummary.textContent = "";
  }

  elements.reviewList.replaceChildren(
    ...visible.map((review) => {
      const item = document.createElement("li");
      item.className = "review-list-item";

      const copy = document.createElement("div");
      const title = document.createElement("p");
      title.className = "review-list-title";
      title.textContent = review.title;
      const meta = document.createElement("p");
      meta.className = "review-list-meta";
      meta.textContent = [
        Number.isFinite(review.rating) ? `ELO ${Math.round(review.rating)}` : "Unrated",
        formatDueDate(review.dueAt)
      ].join(" · ");
      copy.append(title, meta);

      const button = document.createElement("button");
      button.className = "button secondary";
      button.type = "button";
      button.textContent = "Open";
      button.addEventListener("click", () => openLeetCodeProblem(review.slug));

      item.append(copy, button);
      return item;
    })
  );
}

function renderHistory() {
  const recent = sortEventsNewestFirst(events).slice(0, 12);
  elements.historyEmpty.hidden = recent.length > 0;
  elements.historyList.replaceChildren(
    ...recent.map((event) => {
      const item = document.createElement("li");
      item.className = "history-item";

      const dot = document.createElement("span");
      dot.className = `history-dot ${event.outcome}`;
      dot.setAttribute("aria-hidden", "true");

      const content = document.createElement("div");
      const title = document.createElement("p");
      title.className = "history-title";
      title.textContent = `${event.title} · ${capitalize(event.outcome)}`;

      const meta = document.createElement("p");
      meta.className = "history-meta";
      meta.textContent = [
        formatDate(event.occurredAt),
        `confidence ${event.confidence}`,
        event.assistance === "none" ? "unaided" : `${event.assistance} used`
      ].join(" · ");

      content.append(title, meta);
      item.append(dot, content);
      return item;
    })
  );
}

async function recordOutcome(outcome) {
  if (!currentContext?.slug) {
    return;
  }

  const problem = currentProblem();
  const sourceTabId = currentContext.tabId;
  const now = new Date();
  setLearningButtonsDisabled(true);

  try {
    const event = createAttemptEvent({
      problem,
      outcome,
      assistance: elements.assistance.value,
      confidence: elements.confidence.value,
      note: elements.note.value,
      now
    });

    if (outcome === "solved") {
      const initialReview = createInitialReviewItem(problem, now);
      const result = await appendSolveAndEnsureReview(event, initialReview);
      events = result.events;
      reviewItems = result.reviews;
      elements.saveMessage.textContent =
        "Solve recorded. Its first recall review is scheduled for tomorrow.";
    } else {
      events = await appendEvent(event);
      elements.saveMessage.textContent = "Attempt recorded privately.";
    }

    elements.note.value = "";
    renderAll();
    const closeResult = await closeProblemTab(sourceTabId);
    elements.saveMessage.textContent = closeResult.ok
      ? outcome === "solved"
        ? "Solve recorded, review scheduled, and problem tab closed."
        : "Attempt recorded and problem tab closed."
      : `${elements.saveMessage.textContent} Close the LeetCode tab manually.`;
  } catch (error) {
    console.error(error);
    elements.saveMessage.textContent = "RayTrack could not save this event.";
  } finally {
    setLearningButtonsDisabled(false);
  }
}

async function completeCurrentReview() {
  const previousReview = reviewItems.find(
    (item) => item.slug === currentContext?.slug
  );
  if (!previousReview) {
    return;
  }

  const problem = currentProblem();
  const sourceTabId = currentContext.tabId;
  const now = new Date();
  setLearningButtonsDisabled(true);

  try {
    const nextReview = advanceReviewItem(
      previousReview,
      elements.confidence.value,
      now
    );
    const event = createReviewEvent({
      problem,
      previousReview,
      nextReview,
      assistance: elements.assistance.value,
      grade: elements.confidence.value,
      note: elements.note.value,
      now
    });
    const result = await appendReviewAndUpdateSchedule(event, nextReview);
    events = result.events;
    reviewItems = result.reviews;
    elements.note.value = "";
    elements.saveMessage.textContent =
      `Review recorded. Next review ${formatDueDate(nextReview.dueAt)}.`;
    renderAll();
    const closeResult = await closeProblemTab(sourceTabId);
    elements.saveMessage.textContent = closeResult.ok
      ? `Review recorded, next review ${formatDueDate(nextReview.dueAt)}, and problem tab closed.`
      : `${elements.saveMessage.textContent} Close the LeetCode tab manually.`;
  } catch (error) {
    console.error(error);
    elements.saveMessage.textContent = "RayTrack could not complete this review.";
  } finally {
    setLearningButtonsDisabled(false);
  }
}

async function pickRandomProblem() {
  elements.pickProblem.disabled = true;
  elements.pickerMessage.textContent = "";

  try {
    const minRating = Number(elements.eloMin.value);
    const maxRating = Number(elements.eloMax.value);
    if (
      !Number.isFinite(minRating) ||
      !Number.isFinite(maxRating) ||
      minRating < 0 ||
      maxRating > 5000 ||
      minRating > maxRating
    ) {
      throw new RangeError("Enter an ELO range with the minimum no greater than the maximum.");
    }

    settings = await saveSettings({
      eloMin: minRating,
      eloMax: maxRating,
      preferUnsolved: elements.preferUnsolved.checked
    });

    const catalog = await listProblems();
    const solvedSlugs = new Set(
      events
        .filter(
          (event) => event.outcome === "solved" || event.outcome === "reviewed"
        )
        .map((event) => event.slug)
    );
    let selection = selectRandomProblem(catalog, {
      minRating,
      maxRating,
      excludedSlugs: elements.preferUnsolved.checked ? solvedSlugs : new Set()
    });
    let repeated = false;

    if (!selection.problem && elements.preferUnsolved.checked) {
      selection = selectRandomProblem(catalog, { minRating, maxRating });
      repeated = Boolean(selection.problem);
    }
    if (!selection.problem) {
      pickedProblem = null;
      elements.pickedProblem.hidden = true;
      elements.pickerMessage.textContent = "No rated problems match this ELO range.";
      return;
    }

    pickedProblem = selection.problem;
    elements.pickedTitle.textContent = pickedProblem.title;
    elements.pickedRating.textContent =
      `ELO ${Math.round(pickedProblem.rating).toLocaleString()}`;
    renderTopicChips(elements.pickedTopics, pickedProblem.topics);
    elements.pickedProblem.hidden = false;
    elements.pickerMessage.textContent = repeated
      ? `All matching problems were solved, so RayTrack selected a repeat from ${selection.matchCount} matches.`
      : `Randomly selected from ${selection.matchCount} matching problems.`;
  } catch (error) {
    elements.pickedProblem.hidden = true;
    elements.pickerMessage.textContent = error.message;
  } finally {
    elements.pickProblem.disabled = false;
  }
}

async function saveReminderPreferences() {
  const reminderTime = elements.reminderTime.value;
  const dailyReviewLimit = Number(elements.dailyReviewLimit.value);
  if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(reminderTime)) {
    elements.reminderMessage.textContent = "Choose a valid reminder time.";
    return;
  }
  if (
    !Number.isInteger(dailyReviewLimit) ||
    dailyReviewLimit < 1 ||
    dailyReviewLimit > 25
  ) {
    elements.reminderMessage.textContent = "Daily review limit must be 1–25.";
    return;
  }

  elements.saveReminders.disabled = true;
  try {
    settings = await saveSettings({
      remindersEnabled: elements.remindersEnabled.checked,
      reminderTime,
      dailyReviewLimit,
      reminderSnoozedUntil: null
    });
    const permission = await chrome.notifications.getPermissionLevel();
    elements.reminderMessage.textContent =
      settings.remindersEnabled && permission === "denied"
        ? "Saved, but Chrome notifications are currently disabled."
        : settings.remindersEnabled
          ? `Saved. RayTrack will check for due reviews daily at ${formatClockTime(reminderTime)}.`
          : "Reminders disabled. Your review schedule is still preserved.";
    renderReviews();
  } catch (error) {
    console.error(error);
    elements.reminderMessage.textContent = "RayTrack could not save reminder settings.";
  } finally {
    elements.saveReminders.disabled = false;
  }
}

async function testReminder() {
  elements.testReminder.disabled = true;
  try {
    const response = await chrome.runtime.sendMessage({ type: "reminder.test" });
    if (!response?.ok) {
      throw new Error(response?.error || "Notification request failed.");
    }
    elements.reminderMessage.textContent = "Test notification sent.";
  } catch (error) {
    console.error(error);
    elements.reminderMessage.textContent =
      `Chrome could not show the test notification: ${error.message}`;
  } finally {
    elements.testReminder.disabled = false;
  }
}

function populateSettings() {
  if (!settings) {
    return;
  }
  elements.eloMin.value = settings.eloMin;
  elements.eloMax.value = settings.eloMax;
  elements.preferUnsolved.checked = settings.preferUnsolved;
  elements.remindersEnabled.checked = settings.remindersEnabled;
  elements.reminderTime.value = settings.reminderTime;
  elements.dailyReviewLimit.value = settings.dailyReviewLimit;
}

function currentProblem() {
  return currentContext.problem || {
    slug: currentContext.slug,
    title: titleFromSlug(currentContext.slug),
    rating: null,
    topics: []
  };
}

function setLearningButtonsDisabled(disabled) {
  elements.markAttempted.disabled = disabled;
  elements.markSolved.disabled = disabled;
  elements.completeReview.disabled = disabled;
}

function renderTopicChips(container, topics) {
  container.replaceChildren(
    ...topics.map((topic) => {
      const chip = document.createElement("span");
      chip.className = "topic-chip";
      chip.textContent = topic;
      return chip;
    })
  );
}

function exportData() {
  const documentValue = createExportDocument({
    events: sortEventsNewestFirst(events),
    reviews: reviewItems,
    settings
  });
  const blob = new Blob([`${JSON.stringify(documentValue, null, 2)}\n`], {
    type: "application/json"
  });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `raytrack-export-${new Date().toISOString().slice(0, 10)}.json`;
  anchor.click();
  URL.revokeObjectURL(url);
}

async function openLeetCodeProblem(slug) {
  await chrome.tabs.create({
    url: `https://leetcode.com/problems/${encodeURIComponent(slug)}/`
  });
}

async function closeProblemTab(tabId) {
  try {
    const response = await chrome.runtime.sendMessage({
      type: "problem.close",
      tabId
    });
    return response?.ok
      ? { ok: true }
      : { ok: false, error: response?.error || "Tab could not be closed." };
  } catch (error) {
    console.error("RayTrack could not close the problem tab", error);
    return { ok: false, error: error.message };
  }
}

function titleFromSlug(slug) {
  return String(slug)
    .split("-")
    .map(capitalize)
    .join(" ");
}

function capitalize(value) {
  const text = String(value || "");
  return text ? `${text[0].toUpperCase()}${text.slice(1)}` : "";
}

function formatDate(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "Unknown date";
  }
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit"
  }).format(date);
}

function formatDueDate(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "at an unknown time";
  }
  return new Intl.DateTimeFormat(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric"
  }).format(date);
}

function formatClockTime(value) {
  const [hours, minutes] = value.split(":").map(Number);
  const date = new Date();
  date.setHours(hours, minutes, 0, 0);
  return new Intl.DateTimeFormat(undefined, {
    hour: "numeric",
    minute: "2-digit"
  }).format(date);
}

elements.markAttempted.addEventListener("click", () => recordOutcome("attempted"));
elements.markSolved.addEventListener("click", () => recordOutcome("solved"));
elements.completeReview.addEventListener("click", completeCurrentReview);
elements.pickProblem.addEventListener("click", pickRandomProblem);
elements.openPickedProblem.addEventListener("click", () => {
  if (pickedProblem) {
    openLeetCodeProblem(pickedProblem.slug);
  }
});
elements.saveReminders.addEventListener("click", saveReminderPreferences);
elements.testReminder.addEventListener("click", testReminder);
elements.exportData.addEventListener("click", exportData);

initialize().catch((error) => {
  console.error("RayTrack initialization failed", error);
  elements.saveMessage.textContent = "RayTrack could not initialize local storage.";
});
