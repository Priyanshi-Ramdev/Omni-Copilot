const { google } = require('googleapis');
const { Token } = require('../db/database');

function getOAuth2Client() {
  return new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI
  );
}

function getAuthUrl(state) {
  const oauth2Client = getOAuth2Client();
  return oauth2Client.generateAuthUrl({
    access_type: 'offline',
    prompt: 'consent',
    state,
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

async function handleCallback(code, userId) {
  if (!userId) throw new Error('User ID is required for Google OAuth');
  const oauth2Client = getOAuth2Client();
  const { tokens } = await oauth2Client.getToken(code);
  
  await Token.findOneAndUpdate(
    { service: 'google', userId },
    {
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token || undefined,
      token_expiry: tokens.expiry_date || undefined,
      connected_at: new Date()
    },
    { upsert: true, new: true }
  );
  
  return tokens;
}

async function getAuthenticatedClient(userId) {
  if (!userId) throw new Error('User ID is required to get authenticated Google client');
  const row = await Token.findOne({ service: 'google', userId });
  if (!row) throw new Error('Google account not connected. Please connect Google at /auth/google');

  const oauth2Client = getOAuth2Client();
  oauth2Client.setCredentials({
    access_token: row.access_token,
    refresh_token: row.refresh_token,
    expiry_date: row.token_expiry,
  });

  // Auto-refresh if needed
  oauth2Client.on('tokens', async (tokens) => {
    if (tokens.access_token) {
      await Token.updateOne(
        { service: 'google', userId },
        { access_token: tokens.access_token, token_expiry: tokens.expiry_date }
      );
    }
  });

  return oauth2Client;
}

module.exports = { getAuthUrl, handleCallback, getAuthenticatedClient };

