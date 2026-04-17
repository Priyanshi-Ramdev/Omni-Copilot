const axios = require('axios');
const { getDb } = require('../db/database');

function getAuthUrl() {
  const params = new URLSearchParams({
    client_id: process.env.NOTION_CLIENT_ID,
    redirect_uri: process.env.NOTION_REDIRECT_URI,
    response_type: 'code',
    owner: 'user',
  });
  return `https://api.notion.com/v1/oauth/authorize?${params.toString()}`;
}

async function handleCallback(code) {
  const credentials = Buffer.from(`${process.env.NOTION_CLIENT_ID}:${process.env.NOTION_CLIENT_SECRET}`).toString('base64');
  const response = await axios.post('https://api.notion.com/v1/oauth/token', {
    grant_type: 'authorization_code',
    code,
    redirect_uri: process.env.NOTION_REDIRECT_URI,
  }, {
    headers: { Authorization: `Basic ${credentials}`, 'Content-Type': 'application/json' },
  });
  const { access_token, workspace_id, workspace_name } = response.data;
  const db = getDb();
  db.prepare(`
    INSERT OR REPLACE INTO tokens (service, access_token, extra_data, connected_at)
    VALUES ('notion', ?, ?, datetime('now'))
  `).run(access_token, JSON.stringify({ workspace_id, workspace_name }));
  return response.data;
}

function getToken() {
  const db = getDb();
  // Prefer OAuth token, fall back to integration token from .env
  const row = db.prepare("SELECT access_token FROM tokens WHERE service = 'notion'").get();
  if (row) return row.access_token;
  if (process.env.NOTION_TOKEN) return process.env.NOTION_TOKEN;
  throw new Error('Notion not connected. Please connect Notion at /auth/notion or set NOTION_TOKEN in .env');
}

module.exports = { getAuthUrl, handleCallback, getToken };
