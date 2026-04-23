const axios = require('axios');
const zoomOAuth = require('../auth/zoomOAuth');

/**
 * Zoom Tool Handlers
 */
async function createMeeting({ topic, startDateTime, duration, agenda, userId }) {
  const token = await zoomOAuth.getAccessToken(userId);

  try {
    const response = await axios.post(
      'https://api.zoom.us/v2/users/me/meetings',
      {
        topic: topic || 'New Meeting',
        type: 2, // Scheduled meeting
        start_time: startDateTime, // Expects ISO 8601 string
        duration: duration || 30, // in minutes
        agenda: agenda || 'Scheduled via OMNI Copilot',
        settings: {
          host_video: true,
          participant_video: true,
          join_before_host: false,
          mute_upon_entry: true,
          waiting_room: true,
          auto_recording: 'none'
        }
      },
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      }
    );

    const meeting = response.data;
    return {
      success: true,
      meeting_id: meeting.id,
      topic: meeting.topic,
      start_url: meeting.start_url,
      join_url: meeting.join_url,
      password: meeting.password,
      status: meeting.status,
      message: `Zoom meeting created successfully: ${meeting.topic}`
    };
  } catch (err) {
    console.error('[Zoom API Error]', err.response?.data || err.message);
    const apiError = err.response?.data?.message || err.message;
    throw new Error(`Zoom API Error: ${apiError}`);
  }
}

module.exports = { createMeeting };
