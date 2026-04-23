const axios = require('axios');
const { Token } = require('../db/database');

function getAuthUrl(state) {
  const params = new URLSearchParams({
    client_id: process.env.SLACK_CLIENT_ID,
    redirect_uri: process.env.SLACK_REDIRECT_URI,
    scope: 'channels:read,channels:history,chat:write,users:read',
    user_scope: 'channels:read,chat:write',
    state
  });
  return `https://slack.com/oauth/v2/authorize?${params.toString()}`;
}

async function handleCallback(code, userId) {
  if (!userId) throw new Error('User ID is required for Slack OAuth');
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
  
  await Token.findOneAndUpdate(
    { service: 'slack', userId },
    {
      access_token,
      extra_data: JSON.stringify({ team }),
      connected_at: new Date()
    },
    { upsert: true, new: true }
  );
  
  return response.data;
}

async function getToken(userId) {
  if (!userId) throw new Error('User ID is required to get Slack token');
  const row = await Token.findOne({ service: 'slack', userId });
  if (row) return row.access_token;
  if (process.env.SLACK_BOT_TOKEN) return process.env.SLACK_BOT_TOKEN;
  throw new Error('Slack not connected. Please connect Slack at /auth/slack or set SLACK_BOT_TOKEN in .env');
}

module.exports = { getAuthUrl, handleCallback, getToken };

