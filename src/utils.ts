/**
 * Pure URL-routing logic shared between content.ts and the test suite.
 * No browser APIs — safe to import in Node.js.
 */

export const BOOKMARKS_PATH = '/i/bookmarks';

/**
 * Matches the two content URL shapes that focus mode allows:
 *  - /{username}/status/{id}   — individual posts
 *  - /{username}/article/{id}  — long-form articles
 */
export const ALLOWED_URL_PATTERN = /^\/[^/]+\/(status|article)\/\d+/;

/**
 * Returns true when the given pathname should be left alone by focus mode.
 * Anything that returns false should be redirected to /i/bookmarks.
 */
export function isOnAllowedPage(pathname: string): boolean {
  return (
    pathname.startsWith(BOOKMARKS_PATH) ||
    ALLOWED_URL_PATTERN.test(pathname)
  );
}
