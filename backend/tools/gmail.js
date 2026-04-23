const { google } = require('googleapis');
const nodemailer = require('nodemailer');
const { getAuthenticatedClient } = require('../auth/googleOAuth');

async function sendEmail({ to, subject, body, cc, userId }) {
  try {
    const auth = await getAuthenticatedClient(userId);
    const gmail = google.gmail({ version: 'v1', auth });
    const headerLines = [
      `To: ${to}`,
      cc ? `Cc: ${cc}` : null,
      `Subject: ${subject}`,
      'Content-Type: text/html; charset=utf-8',
      'MIME-Version: 1.0'
    ].filter(Boolean);
    const email = headerLines.join('\r\n') + '\r\n\r\n' + (body || '');
    const base64 = Buffer.from(email).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
    await gmail.users.messages.send({ userId: 'me', requestBody: { raw: base64 } });
    return { success: true, message: `Email sent to ${to}`, to, subject };
  } catch (err) {
    // Fallback to SMTP
    if (process.env.SMTP_USER) return sendEmailSMTP({ to, subject, body, cc });
    throw err;
  }
}

async function sendEmailSMTP({ to, subject, body, cc }) {
  const transporter = nodemailer.createTransporter({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.SMTP_PORT || '587'),
    secure: false,
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
  });
  await transporter.sendMail({ from: process.env.SMTP_USER, to, cc, subject, html: body });
  return { success: true, message: `Email sent via SMTP to ${to}`, to, subject };
}

async function readEmails({ maxResults = 10, query = '', userId } = {}) {
  const auth = await getAuthenticatedClient(userId);
  const gmail = google.gmail({ version: 'v1', auth });
  const listRes = await gmail.users.messages.list({ userId: 'me', maxResults, q: query || 'is:inbox' });
  const messages = listRes.data.messages || [];
  const emails = await Promise.all(
    messages.slice(0, 10).map(async (m) => {
      const msg = await gmail.users.messages.get({ userId: 'me', id: m.id });
      const headers = {};
      (msg.data.payload?.headers || []).forEach(h => { headers[h.name] = h.value; });
      
      // Extract body
      let body = '';
      const parts = msg.data.payload?.parts || [msg.data.payload];
      for (const part of parts) {
        if (part.mimeType === 'text/plain' && part.body?.data) {
          body += Buffer.from(part.body.data, 'base64').toString('utf8');
        } else if (part.parts) {
          // Nested parts (common for HTML/Plain mix)
           for (const sub of part.parts) {
             if (sub.mimeType === 'text/plain' && sub.body?.data) {
               body += Buffer.from(sub.body.data, 'base64').toString('utf8');
             }
           }
        }
      }

      return { 
        id: m.id, 
        url: `https://mail.google.com/mail/u/0/#inbox/${m.id}`, 
        from: headers.From, 
        to: headers.To, 
        subject: headers.Subject, 
        date: headers.Date, 
        snippet: msg.data.snippet,
        body: body.slice(0, 5000) // Keep it dense but detailed
      };
    })
  );
  return { success: true, count: emails.length, emails };
}

module.exports = { sendEmail, readEmails };
