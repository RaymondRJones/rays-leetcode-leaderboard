import {
  createAttemptEvent,
  sortEventsNewestFirst,
  statusForProblem,
  summarizeEvents
} from "./domain.js";
import {
  appendEvent,
  createExportDocument,
  getEvents,
  subscribeToEvents
} from "./storage.js";

const elements = {
  emptyState: document.querySelector("#empty-state"),
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
  saveMessage: document.querySelector("#save-message"),
  solvedCount: document.querySelector("#solved-count"),
  attemptedCount: document.querySelector("#attempted-count"),
  eventCount: document.querySelector("#event-count"),
  historyList: document.querySelector("#history-list"),
  historyEmpty: document.querySelector("#history-empty"),
  exportData: document.querySelector("#export-data")
};

let currentContext = null;
let events = [];
const ACTIVE_CONTEXT_KEY = "raytrack.activeProblem";

async function initialize() {
  events = await getEvents();
  renderSummary();
  renderHistory();
  await refreshCurrentProblem();

  subscribeToEvents((nextEvents) => {
    events = nextEvents;
    renderSummary();
    renderHistory();
    renderProblemStatus();
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

function renderCurrentProblem() {
  const problem = currentContext?.problem;
  const slug = currentContext?.slug;

  elements.emptyState.hidden = Boolean(problem || slug);
  elements.problemState.hidden = !(problem || slug);
  if (!problem && !slug) {
    return;
  }

  elements.problemTitle.textContent = problem?.title || titleFromSlug(slug);
  elements.problemRating.textContent = Number.isFinite(problem?.rating)
    ? `ELO ${Math.round(problem.rating).toLocaleString()}`
    : "Unrated";
  elements.problemTopics.replaceChildren(
    ...(problem?.topics || []).map((topic) => {
      const chip = document.createElement("span");
      chip.className = "topic-chip";
      chip.textContent = topic;
      return chip;
    })
  );

  renderProblemStatus();
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

function renderSummary() {
  const summary = summarizeEvents(events);
  elements.solvedCount.textContent = summary.solvedCount.toLocaleString();
  elements.attemptedCount.textContent = summary.attemptedCount.toLocaleString();
  elements.eventCount.textContent = summary.eventCount.toLocaleString();
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

  const problem = currentContext.problem || {
    slug: currentContext.slug,
    title: titleFromSlug(currentContext.slug),
    rating: null,
    topics: []
  };
  setSaving(true);

  try {
    const event = createAttemptEvent({
      problem,
      outcome,
      assistance: elements.assistance.value,
      confidence: elements.confidence.value,
      note: elements.note.value
    });
    events = await appendEvent(event);
    elements.note.value = "";
    elements.saveMessage.textContent =
      outcome === "solved" ? "Solve recorded privately." : "Attempt recorded privately.";
    renderSummary();
    renderHistory();
    renderProblemStatus();
  } catch (error) {
    console.error(error);
    elements.saveMessage.textContent = "RayTrack could not save this event.";
  } finally {
    setSaving(false);
  }
}

function setSaving(saving) {
  elements.markAttempted.disabled = saving;
  elements.markSolved.disabled = saving;
}

function exportData() {
  const documentValue = createExportDocument(sortEventsNewestFirst(events));
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

elements.markAttempted.addEventListener("click", () => recordOutcome("attempted"));
elements.markSolved.addEventListener("click", () => recordOutcome("solved"));
elements.exportData.addEventListener("click", exportData);

initialize().catch((error) => {
  console.error("RayTrack initialization failed", error);
  elements.saveMessage.textContent = "RayTrack could not initialize local storage.";
});
