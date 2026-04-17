const { WebClient } = require('@slack/web-api');
const { getToken } = require('../auth/slackOAuth');

function getClient() {
  return new WebClient(getToken());
}

async function sendMessage({ channel, message, blocks }) {
  const client = getClient();
  const channelId = channel.startsWith('#') ? channel : channel;
  const payload = { channel: channelId, text: message };
  if (blocks) {
    try { payload.blocks = typeof blocks === 'string' ? JSON.parse(blocks) : blocks; } catch {}
  }
  const res = await client.chat.postMessage(payload);
  return { success: true, messageId: res.ts, channel: channelId, message, permalink: `https://slack.com/archives/${res.channel}/p${res.ts.replace('.', '')}` };
}

async function listChannels({ limit = 20 } = {}) {
  const client = getClient();
  const res = await client.conversations.list({ limit, types: 'public_channel,private_channel' });
  const channels = (res.channels || []).map(c => ({
    id: c.id, name: `#${c.name}`, isPrivate: c.is_private,
    memberCount: c.num_members, topic: c.topic?.value,
  }));
  return { success: true, count: channels.length, channels };
}

async function readMessages({ channel, limit = 20 }) {
  const client = getClient();
  const res = await client.conversations.history({ channel, limit });
  const messages = (res.messages || []).map(m => ({
    text: m.text, ts: m.ts, user: m.user,
    date: new Date(parseFloat(m.ts) * 1000).toISOString(),
    reactions: (m.reactions || []).map(r => `${r.name}(${r.count})`),
  }));
  return { success: true, channel, count: messages.length, messages };
}

module.exports = { sendMessage, listChannels, readMessages };
