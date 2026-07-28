import test from "node:test";
import assert from "node:assert/strict";

test("background notifications use a PNG and outcome actions close the source tab", async () => {
  let messageListener;
  const removedTabs = [];
  const removedSessionKeys = [];
  const notifications = [];
  const badgeTexts = [];
  const badgeColors = [];
  const actionTitles = [];
  const createdAlarms = [];
  const session = {
    "raytrack.activeProblem": {
      slug: "two-sum",
      tabId: 42
    }
  };

  globalThis.chrome = {
    runtime: {
      getURL: (path) => `chrome-extension://raytrack/${path}`,
      onInstalled: eventStub(),
      onStartup: eventStub(),
      onMessage: {
        addListener(listener) {
          messageListener = listener;
        }
      }
    },
    alarms: {
      onAlarm: eventStub(),
      async clear() {},
      async create(name, options) {
        createdAlarms.push({ name, options });
      }
    },
    action: {
      async setBadgeBackgroundColor(options) {
        badgeColors.push(options.color);
      },
      async setBadgeText(options) {
        badgeTexts.push(options.text);
      },
      async setTitle(options) {
        actionTitles.push(options.title);
      }
    },
    notifications: {
      onClicked: eventStub(),
      onButtonClicked: eventStub(),
      async getPermissionLevel() {
        return "granted";
      },
      async create(id, options) {
        notifications.push({ id, options });
        return id;
      },
      async clear() {}
    },
    storage: {
      session: {
        async get(key) {
          return Object.hasOwn(session, key) ? { [key]: session[key] } : {};
        },
        async remove(key) {
          removedSessionKeys.push(key);
          delete session[key];
        },
        async set(updates) {
          Object.assign(session, updates);
        }
      },
      local: {
        async get() {
          return {};
        },
        async set() {}
      },
      onChanged: eventStub()
    },
    tabs: {
      async remove(tabId) {
        removedTabs.push(tabId);
      },
      async create() {}
    },
    sidePanel: {
      async setPanelBehavior() {},
      async open() {}
    }
  };

  const background = await import(`../src/background.js?test=${Date.now()}`);

  const notificationResponse = await sendMessage(messageListener, {
    type: "reminder.test"
  });
  assert.equal(notificationResponse.ok, true);
  assert.equal(notifications.length, 1);
  assert.match(notifications[0].options.iconUrl, /^data:image\/png;base64,/);
  const notificationIcon = Buffer.from(
    notifications[0].options.iconUrl.split(",")[1],
    "base64"
  );
  assert.deepEqual(
    [...notificationIcon.subarray(0, 8)],
    [137, 80, 78, 71, 13, 10, 26, 10]
  );
  assert.equal(notificationIcon.readUInt32BE(16), 64);
  assert.equal(notificationIcon.readUInt32BE(20), 64);

  const closeResponse = await sendMessage(messageListener, {
    type: "problem.close",
    tabId: 42
  });
  assert.equal(closeResponse.ok, true);
  assert.deepEqual(removedTabs, [42]);
  assert.deepEqual(removedSessionKeys, ["raytrack.activeProblem"]);

  const badgeResult = await background.updateReviewBadge(
    [
      { slug: "due-one", dueAt: "2026-07-27T12:00:00.000Z" },
      { slug: "due-two", dueAt: "2026-07-28T12:00:00.000Z" },
      { slug: "upcoming", dueAt: "2026-07-30T12:00:00.000Z" }
    ],
    new Date("2026-07-28T18:00:00.000Z")
  );
  assert.equal(badgeResult.dueCount, 2);
  assert.equal(badgeTexts.at(-1), "2");
  assert.equal(badgeColors.at(-1), "#d97706");
  assert.equal(actionTitles.at(-1), "Open RayTrack — 2 reviews due");
  assert.deepEqual(createdAlarms.at(-1), {
    name: "raytrack.badge-refresh",
    options: { when: Date.parse("2026-07-30T12:00:00.000Z") }
  });

  await background.updateReviewBadge([], new Date("2026-07-28T18:00:00.000Z"));
  assert.equal(badgeTexts.at(-1), "");
  assert.equal(actionTitles.at(-1), "Open RayTrack — no reviews due");
});

function eventStub() {
  return {
    addListener() {}
  };
}

function sendMessage(listener, message) {
  return new Promise((resolve, reject) => {
    const keepChannelOpen = listener(message, {}, resolve);
    if (keepChannelOpen !== true) {
      reject(new Error("Background worker did not keep the response channel open."));
    }
  });
}
