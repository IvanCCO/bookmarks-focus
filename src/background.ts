/**
 * X Bookmarks Focus — background service worker
 *
 * Keeps the extension lifecycle alive and logs installation events.
 * The heavy lifting is done entirely in the content script.
 */

chrome.runtime.onInstalled.addListener(({ reason }) => {
  if (reason === chrome.runtime.OnInstalledReason.INSTALL) {
    console.log('[X Bookmarks Focus] Extension installed.');
  } else if (reason === chrome.runtime.OnInstalledReason.UPDATE) {
    console.log('[X Bookmarks Focus] Extension updated.');
  }
});
