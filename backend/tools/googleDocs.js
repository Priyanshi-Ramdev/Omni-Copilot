const { google } = require('googleapis');
const { getAuthenticatedClient } = require('../auth/googleOAuth');

async function createDoc({ title, content, userId }) {
  const auth = await getAuthenticatedClient(userId);
  const docs = google.docs({ version: 'v1', auth });
  const drive = google.drive({ version: 'v3', auth });

  // Create the document
  const docRes = await docs.documents.create({ requestBody: { title } });
  const documentId = docRes.data.documentId;

  // Insert content
  if (content) {
    await docs.documents.batchUpdate({
      documentId,
      requestBody: {
        requests: [{ insertText: { location: { index: 1 }, text: content } }],
      },
    });
  }

  // Get the link
  const fileRes = await drive.files.get({ fileId: documentId, fields: 'webViewLink' });
  return {
    success: true,
    documentId,
    title,
    link: fileRes.data.webViewLink,
    message: `Google Doc "${title}" created successfully`,
  };
}

async function readDoc({ documentId, name, userId }) {
  const auth = await getAuthenticatedClient(userId);
  const docs = google.docs({ version: 'v1', auth });
  const drive = google.drive({ version: 'v3', auth });

  let docId = documentId;
  if (!docId && name) {
    const res = await drive.files.list({
      q: `name contains '${name}' and mimeType = 'application/vnd.google-apps.document'`,
      pageSize: 1, fields: 'files(id)',
    });
    if (!res.data.files.length) throw new Error(`Document "${name}" not found`);
    docId = res.data.files[0].id;
  }

  const docRes = await docs.documents.get({ documentId: docId });
  const content = extractTextFromDoc(docRes.data);
  return { success: true, documentId: docId, title: docRes.data.title, content };
}

function extractTextFromDoc(doc) {
  let text = '';
  const body = doc.body?.content || [];
  for (const element of body) {
    if (element.paragraph) {
      for (const pe of element.paragraph.elements || []) {
        if (pe.textRun) text += pe.textRun.content;
      }
    }
  }
  return text;
}

module.exports = { createDoc, readDoc };
