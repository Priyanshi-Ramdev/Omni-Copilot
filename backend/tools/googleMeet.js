const { google } = require('googleapis');
const { getAuthenticatedClient } = require('../auth/googleOAuth');

async function createMeeting({ title, startDateTime, endDateTime, attendees, description, userId }) {
  const auth = await getAuthenticatedClient(userId);
  const calendar = google.calendar({ version: 'v3', auth });
  const attendeeList = attendees ? attendees.split(',').map(e => ({ email: e.trim() })) : [];
  const event = {
    summary: title,
    description,
    start: { dateTime: startDateTime, timeZone: 'UTC' },
    end: { dateTime: endDateTime, timeZone: 'UTC' },
    attendees: attendeeList,
    conferenceData: {
      createRequest: {
        requestId: `omni-${Date.now()}`,
        conferenceSolutionKey: { type: 'hangoutsMeet' },
      },
    },
    reminders: { useDefault: true },
  };
  const res = await calendar.events.insert({
    calendarId: 'primary',
    requestBody: event,
    conferenceDataVersion: 1,
    sendUpdates: 'all',
  });
  const meetLink = res.data.conferenceData?.entryPoints?.find(ep => ep.entryPointType === 'video')?.uri || res.data.hangoutLink;
  return {
    success: true, eventId: res.data.id, title,
    meetLink, calendarLink: res.data.htmlLink,
    start: startDateTime, end: endDateTime,
    attendees: attendeeList.map(a => a.email),
    message: `Google Meet scheduled: ${meetLink}`,
  };
}

module.exports = { createMeeting };
