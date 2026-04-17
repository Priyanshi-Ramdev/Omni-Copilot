const axios = require('axios');
const { getDb } = require('../db/database');

function getAuthUrl() {
  const params = new URLSearchParams({
    client_id: process.env.SLACK_CLIENT_ID,
    redirect_uri: process.env.SLACK_REDIRECT_URI,
    scope: 'channels:read,channels:history,chat:write,users:read',
    user_scope: 'channels:read,chat:write',
  });
  return `https://slack.com/oauth/v2/authorize?${params.toString()}`;
}

async function handleCallback(code) {
  const response = await axios.post('https://slack.com/api/oauth.v2.access', null, {
    params: {
      client_id: process.env.SLACK_CLIENT_ID,
      client_secret: process.env.SLACK_CLIENT_SECRET,
      code,
      redirect_uri: process.env.SLACK_REDIRECT_URI,
    },
  });
  if (!response.data.ok) throw new Error(response.data.error);
  const { access_token, team } = response.data;
  const db = getDb();
  db.prepare(`
    INSERT OR REPLACE INTO tokens (service, access_token, extra_data, connected_at)
    VALUES ('slack', ?, ?, datetime('now'))
  `).run(access_token, JSON.stringify({ team }));
  return response.data;
}

function getToken() {
  const db = getDb();
  const row = db.prepare("SELECT access_token FROM tokens WHERE service = 'slack'").get();
  if (row) return row.access_token;
  if (process.env.SLACK_BOT_TOKEN) return process.env.SLACK_BOT_TOKEN;
  throw new Error('Slack not connected. Please connect Slack at /auth/slack or set SLACK_BOT_TOKEN in .env');
}

module.exports = { getAuthUrl, handleCallback, getToken };
