const { google } = require('googleapis');
const { getDb } = require('../db/database');

function getOAuth2Client() {
  return new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI
  );
}

function getAuthUrl() {
  const oauth2Client = getOAuth2Client();
  return oauth2Client.generateAuthUrl({
    access_type: 'offline',
    prompt: 'consent',
    scope: [
      'https://www.googleapis.com/auth/drive',
      'https://www.googleapis.com/auth/documents',
      'https://www.googleapis.com/auth/gmail.send',
      'https://www.googleapis.com/auth/gmail.readonly',
      'https://www.googleapis.com/auth/calendar',
      'https://www.googleapis.com/auth/forms.body',
      'openid', 'email', 'profile',
    ],
  });
}

async function handleCallback(code) {
  const oauth2Client = getOAuth2Client();
  const { tokens } = await oauth2Client.getToken(code);
  const db = getDb();
  db.prepare(`
    INSERT OR REPLACE INTO tokens (service, access_token, refresh_token, token_expiry, connected_at)
    VALUES ('google', ?, ?, ?, datetime('now'))
  `).run(tokens.access_token, tokens.refresh_token || null, tokens.expiry_date || null);
  return tokens;
}

async function getAuthenticatedClient() {
  const db = getDb();
  const row = db.prepare("SELECT * FROM tokens WHERE service = 'google'").get();
  if (!row) throw new Error('Google account not connected. Please connect Google at /auth/google');

  const oauth2Client = getOAuth2Client();
  oauth2Client.setCredentials({
    access_token: row.access_token,
    refresh_token: row.refresh_token,
    expiry_date: row.token_expiry,
  });

  // Auto-refresh if needed
  oauth2Client.on('tokens', (tokens) => {
    if (tokens.access_token) {
      db.prepare("UPDATE tokens SET access_token = ?, token_expiry = ? WHERE service = 'google'")
        .run(tokens.access_token, tokens.expiry_date);
    }
  });

  return oauth2Client;
}

module.exports = { getAuthUrl, handleCallback, getAuthenticatedClient };
