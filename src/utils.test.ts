import { describe, it, expect } from 'vitest';
import { isOnAllowedPage, BOOKMARKS_PATH, ALLOWED_URL_PATTERN } from './utils';

describe('ALLOWED_URL_PATTERN', () => {
  it('matches a status URL', () => {
    expect(ALLOWED_URL_PATTERN.test('/someuser/status/1234567890')).toBe(true);
  });

  it('matches an article URL', () => {
    expect(ALLOWED_URL_PATTERN.test('/fcoury/article/2038693821543014506')).toBe(true);
  });

  it('does not match a bare username', () => {
    expect(ALLOWED_URL_PATTERN.test('/someuser')).toBe(false);
  });

  it('does not match /home', () => {
    expect(ALLOWED_URL_PATTERN.test('/home')).toBe(false);
  });

  it('does not match a status URL missing the numeric id', () => {
    expect(ALLOWED_URL_PATTERN.test('/someuser/status/')).toBe(false);
  });
});

describe('isOnAllowedPage', () => {
  // ── Pages that must be allowed ──────────────────────────────────────────

  it('allows the bookmarks root', () => {
    expect(isOnAllowedPage(BOOKMARKS_PATH)).toBe(true);
  });

  it('allows bookmarks sub-paths (e.g. a named list)', () => {
    expect(isOnAllowedPage('/i/bookmarks/1234567890')).toBe(true);
  });

  it('allows an individual post', () => {
    expect(isOnAllowedPage('/elonmusk/status/1234567890123456789')).toBe(true);
  });

  it('allows a long-form article', () => {
    expect(isOnAllowedPage('/fcoury/article/2038693821543014506')).toBe(true);
  });

  // ── Pages that must trigger a redirect ──────────────────────────────────

  it('blocks the home timeline', () => {
    expect(isOnAllowedPage('/home')).toBe(false);
  });

  it('blocks explore', () => {
    expect(isOnAllowedPage('/explore')).toBe(false);
  });

  it('blocks notifications', () => {
    expect(isOnAllowedPage('/notifications')).toBe(false);
  });

  it('blocks direct messages', () => {
    expect(isOnAllowedPage('/messages')).toBe(false);
  });

  it('blocks a user profile page', () => {
    expect(isOnAllowedPage('/someuser')).toBe(false);
  });

  it('blocks Grok', () => {
    expect(isOnAllowedPage('/i/grok')).toBe(false);
  });
});
