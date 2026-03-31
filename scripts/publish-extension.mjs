/**
 * Publishes artifacts/bookmarks-focus.zip to the Chrome Web Store.
 * Called by semantic-release as the publishCmd in .releaserc.json.
 *
 * Required environment variables (set as GitHub Actions secrets):
 *   CHROME_EXTENSION_ID   — the extension's store ID
 *   CHROME_CLIENT_ID      — OAuth2 client ID
 *   CHROME_CLIENT_SECRET  — OAuth2 client secret
 *   CHROME_REFRESH_TOKEN  — OAuth2 refresh token
 *
 * To generate the OAuth2 credentials, follow the guide at:
 * https://github.com/nicowillis/chrome-webstore-upload#setup
 */

import chromeWebstoreUpload from 'chrome-webstore-upload';
import { createReadStream } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ZIP_PATH = join(__dirname, '..', 'artifacts', 'bookmarks-focus.zip');

const {
  CHROME_EXTENSION_ID,
  CHROME_CLIENT_ID,
  CHROME_CLIENT_SECRET,
  CHROME_REFRESH_TOKEN,
} = process.env;

if (!CHROME_EXTENSION_ID || !CHROME_CLIENT_ID || !CHROME_CLIENT_SECRET || !CHROME_REFRESH_TOKEN) {
  console.error(
    'Missing Chrome Web Store credentials.\n' +
    'Set CHROME_EXTENSION_ID, CHROME_CLIENT_ID, CHROME_CLIENT_SECRET, and CHROME_REFRESH_TOKEN.',
  );
  process.exit(1);
}

const store = chromeWebstoreUpload({
  extensionId: CHROME_EXTENSION_ID,
  clientId: CHROME_CLIENT_ID,
  clientSecret: CHROME_CLIENT_SECRET,
  refreshToken: CHROME_REFRESH_TOKEN,
});

console.log('Uploading extension to Chrome Web Store…');
const uploadResult = await store.uploadExisting(createReadStream(ZIP_PATH));

if (uploadResult.uploadState !== 'SUCCESS') {
  console.error('Upload failed:', JSON.stringify(uploadResult, null, 2));
  process.exit(1);
}

console.log('Publishing…');
const publishResult = await store.publish();

if (!publishResult.status?.includes('OK')) {
  console.error('Publish failed:', JSON.stringify(publishResult, null, 2));
  process.exit(1);
}

console.log('Successfully published to Chrome Web Store.');
