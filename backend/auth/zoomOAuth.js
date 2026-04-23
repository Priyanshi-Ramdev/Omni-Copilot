const axios = require('axios');
const { Token } = require('../db/database');

/**
 * Generate Zoom Authorization URL for User OAuth
 * Scopes: meeting:write, user:read:ready
 */
function getAuthUrl(state) {
  const params = new URLSearchParams({
    response_type: 'code',
    client_id: process.env.ZOOM_CLIENT_ID,
    redirect_uri: process.env.ZOOM_REDIRECT_URI,
    scope: 'meeting:write user:read:ready',
    state
  });
  return `https://zoom.us/oauth/authorize?${params.toString()}`;
}

/**
 * Handle OAuth Token Exchange (Code for Tokens)
 */
async function handleCallback(code, userId) {
  if (!userId) throw new Error('User ID is required for Zoom OAuth');
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

    await Token.findOneAndUpdate(
      { service: 'zoom', userId },
      {
        access_token,
        refresh_token: refresh_token || undefined,
        token_expiry: expiry,
        connected_at: new Date()
      },
      { upsert: true, new: true }
    );

    return response.data;
  } catch (err) {
    console.error('[Zoom OAuth Callback Error]', err.response?.data || err.message);
    throw new Error(err.response?.data?.reason || 'Failed to exchange Zoom tokens');
  }
}

/**
 * Get Authenticated Access Token with Auto-refresh
 */
async function getAccessToken(userId) {
  if (!userId) throw new Error('User ID is required to get Zoom access token');
  const row = await Token.findOne({ service: 'zoom', userId });

  if (!row) {
    throw new Error('Zoom account not connected. Please connect Zoom in the sidebar.');
  }

  // Auto-refresh if expired or near expiry (60s buffer)
  if (row.token_expiry && Date.now() > (row.token_expiry - 60000)) {
    return refreshAccessToken(row.refresh_token, userId);
  }

  return row.access_token;
}

/**
 * Internally refresh the access token using the refresh token
 */
async function refreshAccessToken(refreshToken, userId) {
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

    await Token.updateOne(
      { service: 'zoom', userId },
      { access_token, refresh_token, token_expiry: expiry }
    );

    return access_token;
  } catch (err) {
    console.error('[Zoom Token Refresh Error]', err.response?.data || err.message);
    throw new Error('Zoom session expired. Please reconnect your Zoom account.');
  }
}

module.exports = { getAuthUrl, handleCallback, getAccessToken };

