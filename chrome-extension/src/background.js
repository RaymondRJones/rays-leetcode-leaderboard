import { lookupProblem } from "./catalog.js";
import { statusForProblem } from "./domain.js";
import { getEvents, initializeStorage } from "./storage.js";

const ACTIVE_CONTEXT_KEY = "raytrack.activeProblem";

chrome.runtime.onInstalled.addListener(async () => {
  await initializeStorage();
  await chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true });
});

chrome.runtime.onStartup.addListener(async () => {
  await initializeStorage();
  await chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true });
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

async function handleMessage(message, sender) {
  if (message?.type === "problem.activate") {
    const problem = await lookupProblem(message.slug);
    const events = await getEvents();
    const context = {
      slug: message.slug,
      problem,
      status: statusForProblem(events, message.slug),
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

  return { ok: false, error: "Unsupported RayTrack message." };
}
