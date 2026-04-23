const axios = require('axios');
const { Token } = require('../db/database');

function getAuthUrl(state) {
  const params = new URLSearchParams({
    client_id: process.env.NOTION_CLIENT_ID,
    redirect_uri: process.env.NOTION_REDIRECT_URI,
    response_type: 'code',
    owner: 'user',
    state
  });
  return `https://api.notion.com/v1/oauth/authorize?${params.toString()}`;
}

async function handleCallback(code, userId) {
  if (!userId) throw new Error('User ID is required for Notion OAuth');
  const credentials = Buffer.from(`${process.env.NOTION_CLIENT_ID}:${process.env.NOTION_CLIENT_SECRET}`).toString('base64');
  const response = await axios.post('https://api.notion.com/v1/oauth/token', {
    grant_type: 'authorization_code',
    code,
    redirect_uri: process.env.NOTION_REDIRECT_URI,
  }, {
    headers: { Authorization: `Basic ${credentials}`, 'Content-Type': 'application/json' },
  });
  
  const { access_token, workspace_id, workspace_name } = response.data;
  
  await Token.findOneAndUpdate(
    { service: 'notion', userId },
    {
      access_token,
      extra_data: JSON.stringify({ workspace_id, workspace_name }),
      connected_at: new Date()
    },
    { upsert: true, new: true }
  );
  
  return response.data;
}

async function getToken(userId) {
  if (!userId) throw new Error('User ID is required to get Notion token');
  const row = await Token.findOne({ service: 'notion', userId });
  if (row) return row.access_token;
  if (process.env.NOTION_TOKEN) return process.env.NOTION_TOKEN;
  throw new Error('Notion not connected. Please connect Notion at /auth/notion or set NOTION_TOKEN in .env');
}

module.exports = { getAuthUrl, handleCallback, getToken };

