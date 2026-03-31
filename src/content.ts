/**
 * X Bookmarks Focus — content script
 *
 * Behaviour (when enabled):
 *  1. If the user is not on an allowed page, redirect to /i/bookmarks.
 *  2. Hide all distracting elements (right sidebar, trending, ads).
 *  3. Re-applies on every SPA navigation via MutationObserver and History API
 *     interception so rules survive internal route changes.
 *
 * When disabled via the popup the DOM is restored to its original state and
 * all observers are disconnected until re-enabled.
 */

const BOOKMARKS_PATH = '/i/bookmarks';

/**
 * Post URLs look like /{username}/status/{id} — we allow these so the user
 * can read bookmarked posts while still blocking everything else.
 */
const STATUS_URL_PATTERN = /^\/[^/]+\/status\/\d+/;

const DISTRACTION_SELECTORS: readonly string[] = [
  '[data-testid="sidebarColumn"]',    // right sidebar: trending / who to follow
  '[data-testid="placementTracking"]', // promoted tweets
];

// ─── State ───────────────────────────────────────────────────────────────────

/** Elements hidden by this script so we can restore them on disable. */
let hiddenElements: HTMLElement[] = [];

let observer: MutationObserver | null = null;
let previousPath = window.location.pathname;

// ─── Helpers ─────────────────────────────────────────────────────────────────

function isOnAllowedPage(): boolean {
  const path = window.location.pathname;
  return path.startsWith(BOOKMARKS_PATH) || STATUS_URL_PATTERN.test(path);
}

function hideDistractions(): void {
  for (const selector of DISTRACTION_SELECTORS) {
    document.querySelectorAll<HTMLElement>(selector).forEach((el) => {
      if (el.style.display !== 'none') {
        el.style.display = 'none';
        hiddenElements.push(el);
      }
    });
  }
}

/** Removes inline display:none from every element this script has hidden. */
function restoreDistractions(): void {
  hiddenElements.forEach((el) => {
    el.style.display = '';
  });
  hiddenElements = [];
}

function applyFocusMode(): void {
  if (!isOnAllowedPage()) {
    window.location.replace(BOOKMARKS_PATH);
    return;
  }
  hideDistractions();
}

// ─── Observer / history interception ─────────────────────────────────────────

const originalPushState    = history.pushState.bind(history);
const originalReplaceState = history.replaceState.bind(history);

function setupObserver(): void {
  if (observer) return; // already running

  observer = new MutationObserver(() => {
    const currentPath = window.location.pathname;
    if (currentPath !== previousPath) {
      previousPath = currentPath;
      applyFocusMode();
    } else if (isOnAllowedPage()) {
      hideDistractions();
    }
  });

  observer.observe(document.body, { childList: true, subtree: true });

  window.addEventListener('popstate', onPopState);

  history.pushState = function (...args: Parameters<typeof history.pushState>) {
    originalPushState(...args);
    previousPath = window.location.pathname;
    applyFocusMode();
  };

  history.replaceState = function (
    ...args: Parameters<typeof history.replaceState>
  ) {
    originalReplaceState(...args);
    previousPath = window.location.pathname;
    applyFocusMode();
  };
}

function teardownObserver(): void {
  if (!observer) return;

  observer.disconnect();
  observer = null;

  window.removeEventListener('popstate', onPopState);

  history.pushState    = originalPushState;
  history.replaceState = originalReplaceState;
}

function onPopState(): void {
  previousPath = window.location.pathname;
  applyFocusMode();
}

// ─── Enable / disable ────────────────────────────────────────────────────────

function enable(): void {
  applyFocusMode();
  setupObserver();
}

function disable(): void {
  teardownObserver();
  restoreDistractions();
}

// ─── Message listener (from popup) ───────────────────────────────────────────

chrome.runtime.onMessage.addListener(
  (message: { type: string; enabled: boolean }) => {
    if (message.type === 'SET_ENABLED') {
      message.enabled ? enable() : disable();
    }
  },
);

// ─── Initialise from storage ─────────────────────────────────────────────────

chrome.storage.sync.get({ enabled: true }, ({ enabled }) => {
  if (enabled) enable();
});
