/**
 * X Bookmarks Focus — content script
 *
 * All hiding is done by injecting/removing a single <style> element so that:
 *  - CSS applies instantly to every matching element (existing and future).
 *  - Disabling the extension fully restores the page with one removeChild().
 *  - No DOM walking is needed for hiding; the observer only handles redirects.
 */

const BOOKMARKS_PATH = '/i/bookmarks';

/**
 * Allowed URL patterns beyond /i/bookmarks:
 *  - /{username}/status/{id}   — individual posts
 *  - /{username}/article/{id}  — long-form articles
 */
const ALLOWED_URL_PATTERN = /^\/[^/]+\/(status|article)\/\d+/;

/**
 * CSS injected when focus mode is active.
 *
 * Key selector:
 *   nav[aria-label="Primary"] > *:not(a[href="/i/bookmarks"])
 *
 * The nav items are direct <a> / <button> children of the <nav> element,
 * so a single direct-child selector hides every entry except Bookmarks.
 */
const FOCUS_STYLES = `
  /* Right sidebar: trending, "Who to follow", search suggestions */
  [data-testid="sidebarColumn"] { display: none !important; }

  /* Left nav: hide every item except the Bookmarks link */
  nav[aria-label="Primary"] > *:not(a[href="/i/bookmarks"]) {
    display: none !important;
  }

  /* Post / Tweet button */
  [data-testid="SideNav_NewTweet_Button"] { display: none !important; }
`;

// ─── State ───────────────────────────────────────────────────────────────────

let styleEl: HTMLStyleElement | null = null;
let observer: MutationObserver | null = null;
let previousPath = window.location.pathname;

// ─── Helpers ─────────────────────────────────────────────────────────────────

function isOnAllowedPage(): boolean {
  const path = window.location.pathname;
  return path.startsWith(BOOKMARKS_PATH) || ALLOWED_URL_PATTERN.test(path);
}

/** Adds the focus-mode stylesheet to <head> (idempotent). */
function injectStyles(): void {
  if (styleEl) return;
  styleEl = document.createElement('style');
  styleEl.id = 'x-bookmarks-focus-styles';
  styleEl.textContent = FOCUS_STYLES;
  (document.head ?? document.documentElement).appendChild(styleEl);
}

/** Removes the focus-mode stylesheet, instantly restoring all hidden elements. */
function removeStyles(): void {
  styleEl?.remove();
  styleEl = null;
}

/**
 * Redirects to bookmarks if the current page is not allowed.
 * CSS handles all element hiding — nothing to do here for that.
 */
function applyFocusMode(): void {
  if (!isOnAllowedPage()) {
    window.location.replace(BOOKMARKS_PATH);
  }
}

// ─── Observer / history interception ─────────────────────────────────────────

const originalPushState    = history.pushState.bind(history);
const originalReplaceState = history.replaceState.bind(history);

function onPopState(): void {
  previousPath = window.location.pathname;
  applyFocusMode();
}

function setupObserver(): void {
  if (observer) return;

  // Only need to watch for path changes to trigger redirects.
  observer = new MutationObserver(() => {
    const currentPath = window.location.pathname;
    if (currentPath !== previousPath) {
      previousPath = currentPath;
      applyFocusMode();
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

// ─── Enable / disable ────────────────────────────────────────────────────────

function enable(): void {
  injectStyles();
  applyFocusMode();
  setupObserver();
}

function disable(): void {
  teardownObserver();
  removeStyles();
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
