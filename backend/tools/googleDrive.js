const { google } = require('googleapis');
const { getAuthenticatedClient } = require('../auth/googleOAuth');

async function listFiles({ query = '', maxResults = 20, userId } = {}) {
  const auth = await getAuthenticatedClient(userId);
  const drive = google.drive({ version: 'v3', auth });
  const q = query || "trashed = false";
  const res = await drive.files.list({
    q,
    pageSize: maxResults,
    fields: 'files(id, name, mimeType, webViewLink, size, modifiedTime, owners)',
    orderBy: 'modifiedTime desc',
  });
  const files = res.data.files || [];
  return {
    success: true,
    count: files.length,
    files: files.map(f => ({
      id: f.id,
      name: f.name,
      type: f.mimeType,
      link: f.webViewLink,
      modified: f.modifiedTime,
      size: f.size,
    })),
  };
}

async function createFolder({ name, parentId, userId } = {}) {
  const auth = await getAuthenticatedClient(userId);
  const drive = google.drive({ version: 'v3', auth });
  const fileMetadata = {
    name,
    mimeType: 'application/vnd.google-apps.folder',
    ...(parentId && { parents: [parentId] }),
  };
  const res = await drive.files.create({ requestBody: fileMetadata, fields: 'id,name,webViewLink' });
  return { success: true, id: res.data.id, name: res.data.name, link: res.data.webViewLink };
}

async function uploadFile({ name, content, mimeType = 'text/plain', folderId, userId } = {}) {
  const auth = await getAuthenticatedClient(userId);
  const drive = google.drive({ version: 'v3', auth });
  const { Readable } = require('stream');
  const stream = Readable.from([content]);
  const res = await drive.files.create({
    requestBody: {
      name,
      ...(folderId && { parents: [folderId] }),
    },
    media: { mimeType, body: stream },
    fields: 'id,name,webViewLink',
  });
  return { success: true, id: res.data.id, name: res.data.name, link: res.data.webViewLink };
}

module.exports = { listFiles, createFolder, uploadFile };
