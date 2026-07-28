(() => {
  const ROOT_ID = "raytrack-problem-pill";
  let activeSlug = null;
  let renderToken = 0;

  function extractSlug() {
    const match = window.location.pathname.match(/^\/problems\/([^/]+)(?:\/|$)/);
    return match ? decodeURIComponent(match[1]).trim().toLowerCase() : null;
  }

  async function activateCurrentProblem() {
    const slug = extractSlug();
    if (!slug || slug === activeSlug) {
      return;
    }

    activeSlug = slug;
    const token = ++renderToken;
    removePill();

    try {
      const response = await chrome.runtime.sendMessage({
        type: "problem.activate",
        slug
      });
      if (token !== renderToken || !response?.ok) {
        return;
      }
      renderPill(response.context);
    } catch (error) {
      console.debug("RayTrack could not activate this problem.", error);
    }
  }

  function removePill() {
    document.getElementById(ROOT_ID)?.remove();
  }

  function renderPill(context) {
    const host = document.createElement("div");
    host.id = ROOT_ID;
    host.style.position = "fixed";
    host.style.right = "18px";
    host.style.bottom = "18px";
    host.style.zIndex = "2147483647";

    const root = host.attachShadow({ mode: "closed" });
    const button = document.createElement("button");
    const rating = Number.isFinite(context.problem?.rating)
      ? Math.round(context.problem.rating).toLocaleString()
      : "Unrated";
    const statusLabel =
      context.status === "solved"
        ? "Solved"
        : context.status === "attempted"
          ? "Attempted"
          : "New";

    button.type = "button";
    button.setAttribute(
      "aria-label",
      `Open RayTrack. Estimated ELO ${rating}. Status ${statusLabel}.`
    );
    button.innerHTML = `
      <span class="mark" aria-hidden="true">R</span>
      <span class="copy">
        <span class="label">RayTrack ELO</span>
        <strong>${escapeHtml(rating)}</strong>
      </span>
      <span class="status status-${escapeHtml(context.status)}">${escapeHtml(statusLabel)}</span>
    `;

    const style = document.createElement("style");
    style.textContent = `
      button {
        all: initial;
        box-sizing: border-box;
        display: flex;
        align-items: center;
        gap: 9px;
        min-height: 48px;
        padding: 7px 10px 7px 8px;
        border: 1px solid #343a43;
        border-radius: 12px;
        background: rgba(20, 23, 28, 0.96);
        box-shadow: 0 10px 32px rgba(0, 0, 0, 0.38);
        color: #f5f7fa;
        cursor: pointer;
        font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      }
      button:hover {
        border-color: #4c5663;
        transform: translateY(-1px);
      }
      button:focus-visible {
        outline: 2px solid #80bfff;
        outline-offset: 3px;
      }
      .mark {
        display: grid;
        place-items: center;
        width: 31px;
        height: 31px;
        border-radius: 9px;
        background: #38d996;
        color: #06150e;
        font-size: 15px;
        font-weight: 900;
      }
      .copy {
        display: grid;
        line-height: 1.05;
      }
      .label {
        color: #9aa3af;
        font-size: 9px;
        font-weight: 800;
        letter-spacing: 0.08em;
        text-transform: uppercase;
      }
      strong {
        margin-top: 3px;
        color: #ffbf5c;
        font-size: 15px;
      }
      .status {
        margin-left: 2px;
        padding: 3px 6px;
        border-radius: 999px;
        background: #252a31;
        color: #bdc5cf;
        font-size: 9px;
        font-weight: 700;
      }
      .status-solved {
        background: #123c2d;
        color: #95f4c8;
      }
      .status-attempted {
        background: #3a2d15;
        color: #ffd388;
      }
    `;

    button.addEventListener("click", async () => {
      try {
        await chrome.runtime.sendMessage({ type: "panel.open" });
      } catch (error) {
        console.debug("RayTrack side panel could not be opened.", error);
      }
    });

    root.append(style, button);
    document.documentElement.append(host);
  }

  function escapeHtml(value) {
    return String(value)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  chrome.storage.onChanged.addListener((changes, areaName) => {
    if (areaName === "local" && changes["raytrack.events"] && activeSlug) {
      const slug = activeSlug;
      activeSlug = null;
      if (slug === extractSlug()) {
        activateCurrentProblem();
      }
    }
  });

  activateCurrentProblem();

  window.setInterval(() => {
    const slug = extractSlug();
    if (slug !== activeSlug) {
      activateCurrentProblem();
    }
  }, 1000);
})();
