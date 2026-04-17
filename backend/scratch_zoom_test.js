const axios = require('axios');
require('dotenv').config({ path: './.env' });

const { ZOOM_ACCOUNT_ID, ZOOM_CLIENT_ID, ZOOM_CLIENT_SECRET } = process.env;

async function testS2S() {
  console.log('--- Testing Server-to-Server (S2S) OAuth ---');
  if (!ZOOM_ACCOUNT_ID) {
    console.log('Skipping S2S: No Account ID provided.');
    return;
  }
  
  const authHeader = Buffer.from(`${ZOOM_CLIENT_ID}:${ZOOM_CLIENT_SECRET}`).toString('base64');
  const body = new URLSearchParams();
  body.append('grant_type', 'account_credentials');
  body.append('account_id', ZOOM_ACCOUNT_ID);

  try {
    const res = await axios.post('https://zoom.us/oauth/token', body, {
      headers: {
        'Authorization': `Basic ${authHeader}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    });
    console.log('✅ S2S SUCCESS: Token received.');
    return true;
  } catch (err) {
    console.log('❌ S2S FAILED:', err.response?.data || err.message);
    return false;
  }
}

async function testUserOAuth() {
  console.log('\n--- Testing User OAuth Logic ---');
  console.log('Requesting Auth URL: https://zoom.us/oauth/authorize?response_type=code&client_id=' + ZOOM_CLIENT_ID);
  // We can't actually complete the flow without a redirect, but we can check if Zoom accepts the Client ID
  try {
    const res = await axios.get(`https://zoom.us/oauth/authorize?response_type=code&client_id=${ZOOM_CLIENT_ID}&redirect_uri=${encodeURIComponent(process.env.ZOOM_REDIRECT_URI)}`);
    if (res.status === 200) {
      console.log('✅ User OAuth: Zoom Login Page found.');
    } else {
      console.log('❌ User OAuth: Unexpected response status', res.status);
    }
  } catch (err) {
    if (err.response?.status === 302 || err.response?.status === 200) {
        console.log('✅ User OAuth: Client ID is recognized by Zoom login endpoint.');
    } else {
        console.log('❌ User OAuth: FAILED:', err.response?.data || err.message);
    }
  }
}

async function run() {
    await testS2S();
    await testUserOAuth();
}

run();
