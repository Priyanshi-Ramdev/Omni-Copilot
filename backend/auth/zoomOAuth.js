const axios = require('axios');
const { getDb } = require('../db/database');

/**
 * Generate Zoom Authorization URL for User OAuth
 * Scopes: meeting:write, user:read:ready
 */
function getAuthUrl() {
  const params = new URLSearchParams({
    response_type: 'code',
    client_id: process.env.ZOOM_CLIENT_ID,
    redirect_uri: process.env.ZOOM_REDIRECT_URI,
  });
  return `https://zoom.us/oauth/authorize?${params.toString()}`;
}

/**
 * Handle OAuth Token Exchange (Code for Tokens)
 */
async function handleCallback(code) {
  const authHeader = Buffer.from(
    `${process.env.ZOOM_CLIENT_ID}:${process.env.ZOOM_CLIENT_SECRET}`
  ).toString('base64');

  try {
    const response = await axios.post('https://zoom.us/oauth/token', null, {
      params: {
        grant_type: 'authorization_code',
        code,
        redirect_uri: process.env.ZOOM_REDIRECT_URI,
      },
      headers: {
        'Authorization': `Basic ${authHeader}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    });

    const { access_token, refresh_token, expires_in } = response.data;
    const expiry = Date.now() + (expires_in * 1000);

    const db = getDb();
    db.prepare(`
      INSERT OR REPLACE INTO tokens (service, access_token, refresh_token, token_expiry, connected_at)
      VALUES ('zoom', ?, ?, ?, datetime('now'))
    `).run(access_token, refresh_token, expiry);

    return response.data;
  } catch (err) {
    console.error('[Zoom OAuth Callback Error]', err.response?.data || err.message);
    throw new Error(err.response?.data?.reason || 'Failed to exchange Zoom tokens');
  }
}

/**
 * Get Authenticated Access Token with Auto-refresh
 */
async function getAccessToken() {
  const db = getDb();
  const row = db.prepare("SELECT * FROM tokens WHERE service = 'zoom'").get();

  if (!row) {
    throw new Error('Zoom account not connected. Please connect Zoom in the sidebar.');
  }

  // Auto-refresh if expired or near expiry (60s buffer)
  if (row.token_expiry && Date.now() > (row.token_expiry - 60000)) {
    return refreshAccessToken(row.refresh_token);
  }

  return row.access_token;
}

/**
 * Internally refresh the access token using the refresh token
 */
async function refreshAccessToken(refreshToken) {
  const authHeader = Buffer.from(
    `${process.env.ZOOM_CLIENT_ID}:${process.env.ZOOM_CLIENT_SECRET}`
  ).toString('base64');

  try {
    const response = await axios.post('https://zoom.us/oauth/token', null, {
      params: {
        grant_type: 'refresh_token',
        refresh_token: refreshToken,
      },
      headers: {
        'Authorization': `Basic ${authHeader}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    });

    const { access_token, refresh_token, expires_in } = response.data;
    const expiry = Date.now() + (expires_in * 1000);

    const db = getDb();
    db.prepare(`
      UPDATE tokens 
      SET access_token = ?, refresh_token = ?, token_expiry = ? 
      WHERE service = 'zoom'
    `).run(access_token, refresh_token, expiry);

    return access_token;
  } catch (err) {
    console.error('[Zoom Token Refresh Error]', err.response?.data || err.message);
    throw new Error('Zoom session expired. Please reconnect your Zoom account.');
  }
}

module.exports = { getAuthUrl, handleCallback, getAccessToken };
