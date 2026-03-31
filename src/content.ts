/**
 * X Bookmarks Focus — content script
 *
 * Behaviour:
 *  1. If the user is not on the bookmarks page, redirect to /i/bookmarks.
 *  2. On the bookmarks page, hide all distracting elements (right sidebar,
 *     trending, "Who to follow", etc.) while keeping the bookmarks feed and
 *     the left navigation (bookmark sidebar).
 *  3. Re-applies on every SPA navigation via MutationObserver and History API
 *     interception so the rules survive internal route changes.
 */

const BOOKMARKS_PATH = '/i/bookmarks';

/**
 * A post URL looks like /{username}/status/{id} or /{username}/status/{id}/...
 * We allow these so the user can read bookmarked posts, but still block
 * everything else (home feed, explore, notifications, profiles, etc.).
 */
const STATUS_URL_PATTERN = /^\/[^/]+\/status\/\d+/;

/**
 * Selectors for elements that should always be hidden when on any X page.
 * Prefer [data-testid] and [aria-label] attributes because they are more
 * stable than generated class names.
 */
const DISTRACTION_SELECTORS: readonly string[] = [
  // Right sidebar: trending, "Who to follow", search suggestions
  '[data-testid="sidebarColumn"]',

  // Promoted / sponsored tweets injected into the bookmarks feed
  '[data-testid="placementTracking"]',
];

/**
 * Returns true when the current URL is allowed:
 *  - The bookmarks page (/i/bookmarks)
 *  - An individual post page (/{user}/status/{id})
 */
function isOnAllowedPage(): boolean {
  const path = window.location.pathname;
  return path.startsWith(BOOKMARKS_PATH) || STATUS_URL_PATTERN.test(path);
}

/** Hides every element matched by the distraction selectors. */
function hideDistractions(): void {
  for (const selector of DISTRACTION_SELECTORS) {
    document.querySelectorAll<HTMLElement>(selector).forEach((el) => {
      if (el.style.display !== 'none') {
        el.style.display = 'none';
      }
    });
  }
}

/**
 * Either redirects the user to bookmarks (if they're not on an allowed page)
 * or applies the distraction-hiding logic.
 */
function applyFocusMode(): void {
  if (!isOnAllowedPage()) {
    window.location.replace(BOOKMARKS_PATH);
    return;
  }
  hideDistractions();
}

// ─── Initial run ────────────────────────────────────────────────────────────

applyFocusMode();

// ─── SPA navigation handling ─────────────────────────────────────────────────

let previousPath = window.location.pathname;

/**
 * Called whenever the DOM mutates.  Checks for path changes (SPA navigation)
 * and, on the bookmarks page, continuously hides any newly-inserted distracting
 * elements (X can re-insert them after route changes).
 */
const observer = new MutationObserver(() => {
  const currentPath = window.location.pathname;

  if (currentPath !== previousPath) {
    previousPath = currentPath;
    applyFocusMode();
  } else if (isOnAllowedPage()) {
    // Re-hide in case X re-rendered the sidebar or injected an ad
    hideDistractions();
  }
});

observer.observe(document.body, { childList: true, subtree: true });

// Handle browser back/forward navigation
window.addEventListener('popstate', () => {
  previousPath = window.location.pathname;
  applyFocusMode();
});

// Intercept pushState / replaceState so programmatic SPA navigation is caught
const originalPushState = history.pushState.bind(history);
const originalReplaceState = history.replaceState.bind(history);

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
