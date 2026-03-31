/**
 * X Bookmarks Focus — popup script
 *
 * Reads the enabled/disabled state from chrome.storage.sync, renders the
 * toggle button accordingly, and persists + broadcasts any change.
 */

const toggleBtn = document.getElementById('toggle') as HTMLButtonElement;
const labelEl   = document.getElementById('label')  as HTMLSpanElement;
const statusEl  = document.getElementById('status') as HTMLParagraphElement;

/** Reads the current enabled state from storage (defaults to true). */
async function getEnabled(): Promise<boolean> {
  const result = await chrome.storage.sync.get({ enabled: true });
  return result['enabled'] as boolean;
}

/** Renders the button to reflect the given state. */
function renderState(enabled: boolean): void {
  if (enabled) {
    toggleBtn.className  = 'is-enabled';
    labelEl.textContent  = 'Enabled';
    statusEl.textContent = 'Redirecting to bookmarks \u00B7 hiding distractions';
  } else {
    toggleBtn.className  = 'is-disabled';
    labelEl.textContent  = 'Disabled';
    statusEl.textContent = 'Extension is paused \u00B7 X works normally';
  }
}

/** Sends the new state to the content script running in the active tab. */
async function notifyActiveTab(enabled: boolean): Promise<void> {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (tab?.id == null) return;

  chrome.tabs.sendMessage(tab.id, { type: 'SET_ENABLED', enabled }).catch(() => {
    // The active tab might not be an X page — that's fine, ignore the error.
  });
}

/** Handles a toggle click: flips the state, persists it, and notifies the tab. */
async function onToggle(): Promise<void> {
  const current = await getEnabled();
  const next    = !current;

  await chrome.storage.sync.set({ enabled: next });
  renderState(next);
  await notifyActiveTab(next);
}

// ─── Init ────────────────────────────────────────────────────────────────────

getEnabled().then(renderState);
toggleBtn.addEventListener('click', onToggle);
