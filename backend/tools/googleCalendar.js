const { google } = require('googleapis');
const { getAuthenticatedClient } = require('../auth/googleOAuth');

async function createEvent({ title, description, startDateTime, endDateTime, attendees, location, userId }) {
  const auth = await getAuthenticatedClient(userId);
  const calendar = google.calendar({ version: 'v3', auth });
  const attendeeList = attendees ? attendees.split(',').map(e => ({ email: e.trim() })) : [];
  const event = {
    summary: title,
    description,
    location,
    start: { dateTime: startDateTime, timeZone: 'UTC' },
    end: { dateTime: endDateTime, timeZone: 'UTC' },
    attendees: attendeeList,
    reminders: { useDefault: true },
  };
  const res = await calendar.events.insert({ calendarId: 'primary', requestBody: event, sendUpdates: 'all' });
  return {
    success: true, eventId: res.data.id, title, link: res.data.htmlLink,
    start: startDateTime, end: endDateTime,
    attendees: attendeeList.map(a => a.email),
    message: `Calendar event "${title}" created`,
  };
}

async function listEvents({ maxResults = 10, timeMin, timeMax, userId } = {}) {
  const auth = await getAuthenticatedClient(userId);
  const calendar = google.calendar({ version: 'v3', auth });
  const res = await calendar.events.list({
    calendarId: 'primary',
    timeMin: timeMin || new Date().toISOString(),
    timeMax,
    maxResults,
    singleEvents: true,
    orderBy: 'startTime',
  });
  const events = (res.data.items || []).map(e => ({
    id: e.id, title: e.summary, start: e.start?.dateTime || e.start?.date,
    end: e.end?.dateTime || e.end?.date, link: e.htmlLink,
    attendees: (e.attendees || []).map(a => a.email),
    location: e.location, description: e.description,
  }));
  return { success: true, count: events.length, events };
}

module.exports = { createEvent, listEvents };
