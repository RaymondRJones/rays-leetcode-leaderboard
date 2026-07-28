import { lookupProblem } from "./catalog.js";
import {
  getDueReviewItems,
  nextReminderAt,
  statusForProblem
} from "./domain.js";
import {
  getEvents,
  getReviewItems,
  getSettings,
  initializeStorage,
  saveSettings
} from "./storage.js";
import { NOTIFICATION_ICON_DATA_URL } from "./notification-icon.js";

const ACTIVE_CONTEXT_KEY = "raytrack.activeProblem";
const REVIEW_ALARM = "raytrack.review-reminder";
const REVIEW_NOTIFICATION = "raytrack.reviews-due";
const BADGE_REFRESH_ALARM = "raytrack.badge-refresh";

chrome.runtime.onInstalled.addListener(async () => {
  await initializeBackground();
});

chrome.runtime.onStartup.addListener(async () => {
  await initializeBackground();
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  handleMessage(message, sender)
    .then(sendResponse)
    .catch((error) => {
      console.error("RayTrack message failed", error);
      sendResponse({ ok: false, error: error.message });
    });
  return true;
});

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === REVIEW_ALARM) {
    handleReviewAlarm().catch((error) => {
      console.error("RayTrack reminder failed", error);
    });
  } else if (alarm.name === BADGE_REFRESH_ALARM) {
    updateReviewBadge().catch((error) => {
      console.error("RayTrack badge refresh failed", error);
    });
  }
});

chrome.notifications.onClicked.addListener((notificationId) => {
  if (notificationId === REVIEW_NOTIFICATION) {
    openFirstDueReview().catch((error) => {
      console.error("RayTrack could not open a due review", error);
    });
  }
});

chrome.notifications.onButtonClicked.addListener((notificationId, buttonIndex) => {
  if (notificationId !== REVIEW_NOTIFICATION) {
    return;
  }

  const action = buttonIndex === 0 ? openFirstDueReview() : snoozeReminder();
  action.catch((error) => {
    console.error("RayTrack notification action failed", error);
  });
});

chrome.storage.onChanged.addListener((changes, areaName) => {
  if (areaName !== "local") {
    return;
  }

  if (changes["raytrack.settings"]) {
    scheduleReviewReminder().catch((error) => {
      console.error("RayTrack could not reschedule reminders", error);
    });
  }
  if (changes["raytrack.reviews"]) {
    const reviewItems = Array.isArray(changes["raytrack.reviews"].newValue)
      ? changes["raytrack.reviews"].newValue
      : [];
    updateReviewBadge(reviewItems).catch((error) => {
      console.error("RayTrack could not update its review badge", error);
    });
  }
});

async function handleMessage(message, sender) {
  if (message?.type === "problem.activate") {
    const problem = await lookupProblem(message.slug);
    const events = await getEvents();
    const context = {
      slug: message.slug,
      problem,
      status: statusForProblem(events, message.slug),
      tabId: typeof sender.tab?.id === "number" ? sender.tab.id : null,
      activatedAt: new Date().toISOString()
    };
    await chrome.storage.session.set({ [ACTIVE_CONTEXT_KEY]: context });
    return { ok: true, context };
  }

  if (message?.type === "problem.current") {
    const result = await chrome.storage.session.get(ACTIVE_CONTEXT_KEY);
    return { ok: true, context: result[ACTIVE_CONTEXT_KEY] || null };
  }

  if (message?.type === "panel.open") {
    if (typeof sender.tab?.windowId !== "number") {
      throw new Error("RayTrack could not identify the current browser window.");
    }
    await chrome.sidePanel.open({ windowId: sender.tab.windowId });
    return { ok: true };
  }

  if (message?.type === "problem.close") {
    const tabId = Number(message.tabId);
    if (!Number.isInteger(tabId)) {
      return {
        ok: false,
        error: "RayTrack did not receive a valid LeetCode tab identifier."
      };
    }
    const result = await chrome.storage.session.get(ACTIVE_CONTEXT_KEY);
    const context = result[ACTIVE_CONTEXT_KEY];
    if (context?.tabId === tabId) {
      await chrome.storage.session.remove(ACTIVE_CONTEXT_KEY);
    }
    await chrome.tabs.remove(tabId);
    return { ok: true, closed: true };
  }

  if (message?.type === "reminder.test") {
    const permission = await chrome.notifications.getPermissionLevel();
    if (permission === "denied") {
      return {
        ok: false,
        error: "Chrome notifications are disabled for RayTrack."
      };
    }
    await chrome.notifications.create("raytrack.test-reminder", {
      type: "basic",
      iconUrl: NOTIFICATION_ICON_DATA_URL,
      title: "RayTrack reminders are working",
      message: "Due reviews will appear here at your chosen time.",
      contextMessage: "RayTrack · test notification"
    });
    return { ok: true };
  }

  return { ok: false, error: "Unsupported RayTrack message." };
}

async function initializeBackground() {
  await initializeStorage();
  await chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true });
  await Promise.all([scheduleReviewReminder(), updateReviewBadge()]);
}

export async function updateReviewBadge(reviewItemsValue = null, now = new Date()) {
  const reviewItems = reviewItemsValue || (await getReviewItems());
  const dueCount = getDueReviewItems(reviewItems, now).length;
  const badgeText = dueCount > 99 ? "99+" : dueCount > 0 ? String(dueCount) : "";
  const title =
    dueCount > 0
      ? `Open RayTrack — ${dueCount} review${dueCount === 1 ? "" : "s"} due`
      : "Open RayTrack — no reviews due";

  await Promise.all([
    chrome.action.setBadgeBackgroundColor({ color: "#d97706" }),
    chrome.action.setBadgeText({ text: badgeText }),
    chrome.action.setTitle({ title })
  ]);

  await chrome.alarms.clear(BADGE_REFRESH_ALARM);
  const nowTime = now.getTime();
  const nextDueTime = reviewItems.reduce((earliest, item) => {
    const dueTime = Date.parse(item?.dueAt || "");
    return Number.isFinite(dueTime) && dueTime > nowTime
      ? Math.min(earliest, dueTime)
      : earliest;
  }, Number.POSITIVE_INFINITY);
  if (Number.isFinite(nextDueTime)) {
    await chrome.alarms.create(BADGE_REFRESH_ALARM, { when: nextDueTime });
  }

  return { dueCount, badgeText, nextDueTime };
}

async function scheduleReviewReminder(settingsValue = null, now = new Date()) {
  const settings = settingsValue || (await getSettings());
  await chrome.alarms.clear(REVIEW_ALARM);
  if (!settings.remindersEnabled) {
    return null;
  }

  const next = nextReminderAt(
    now,
    settings.reminderTime,
    settings.reminderSnoozedUntil
  );
  await chrome.alarms.create(REVIEW_ALARM, { when: next.getTime() });
  return next;
}

async function handleReviewAlarm() {
  const [settings, reviewItems] = await Promise.all([
    getSettings(),
    getReviewItems()
  ]);
  await updateReviewBadge(reviewItems);
  if (!settings.remindersEnabled) {
    return;
  }

  const due = getDueReviewItems(reviewItems, new Date());
  if (due.length > 0) {
    const limit = Math.max(1, Number(settings.dailyReviewLimit) || 5);
    const visibleCount = Math.min(due.length, limit);
    await chrome.notifications.create(REVIEW_NOTIFICATION, {
      type: "basic",
      iconUrl: NOTIFICATION_ICON_DATA_URL,
      title: `${due.length} LeetCode review${due.length === 1 ? "" : "s"} due`,
      message:
        due.length === 1
          ? `${due[0].title} is ready for retrieval practice.`
          : `Start with ${due[0].title}. Today's queue is capped at ${visibleCount}.`,
      contextMessage: "RayTrack · local practice reminder",
      buttons: [
        { title: "Start review" },
        { title: "Snooze 1 day" }
      ]
    });
  }

  if (settings.reminderSnoozedUntil) {
    await saveSettings({ reminderSnoozedUntil: null });
  } else {
    await scheduleReviewReminder(settings);
  }
}

async function openFirstDueReview() {
  const due = getDueReviewItems(await getReviewItems(), new Date());
  if (due.length === 0) {
    await chrome.notifications.clear(REVIEW_NOTIFICATION);
    return;
  }

  await chrome.tabs.create({
    url: `https://leetcode.com/problems/${encodeURIComponent(due[0].slug)}/`
  });
  await chrome.notifications.clear(REVIEW_NOTIFICATION);
}

async function snoozeReminder() {
  const snoozedUntil = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
  await saveSettings({ reminderSnoozedUntil: snoozedUntil });
  await chrome.notifications.clear(REVIEW_NOTIFICATION);
}
