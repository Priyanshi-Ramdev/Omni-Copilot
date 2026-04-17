const axios = require('axios');

async function sendMessage({ channelId, message }) {
  const token = process.env.DISCORD_BOT_TOKEN;
  if (!token) throw new Error('Discord bot token not configured. Set DISCORD_BOT_TOKEN in .env');
  const res = await axios.post(
    `https://discord.com/api/v10/channels/${channelId}/messages`,
    { content: message },
    { headers: { Authorization: `Bot ${token}`, 'Content-Type': 'application/json' } }
  );
  return { success: true, messageId: res.data.id, channelId, content: message };
}

module.exports = { sendMessage };
