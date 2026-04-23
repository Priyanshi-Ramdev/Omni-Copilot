const { google } = require('googleapis');
const { getAuthenticatedClient } = require('../auth/googleOAuth');

const TYPE_MAP = {
  TEXT: 'textQuestion',
  MULTIPLE_CHOICE: 'choiceQuestion',
  CHECKBOX: 'choiceQuestion',
  SCALE: 'scaleQuestion',
};

async function createForm({ title, description, questions, userId }) {
  const auth = await getAuthenticatedClient(userId);
  const forms = google.forms({ version: 'v1', auth });

  // Parse questions
  let parsedQuestions = [];
  try {
    parsedQuestions = typeof questions === 'string' ? JSON.parse(questions) : questions;
  } catch { parsedQuestions = []; }

  // Create the form
  const formRes = await forms.forms.create({ requestBody: { info: { title, documentTitle: title } } });
  const formId = formRes.data.formId;

  // Build requests to add questions
  const requests = [];
  if (description) {
    requests.push({ updateFormInfo: { info: { description }, updateMask: 'description' } });
  }
  parsedQuestions.forEach((q, i) => {
    const questionItem = {
      createItem: {
        item: {
          title: q.title,
          questionItem: {
            question: {
              required: q.required || false,
              ...(q.type === 'TEXT' && { textQuestion: {} }),
              ...(q.type === 'MULTIPLE_CHOICE' && { choiceQuestion: { type: 'RADIO', options: (q.options || []).map(o => ({ value: o })) } }),
              ...(q.type === 'CHECKBOX' && { choiceQuestion: { type: 'CHECKBOX', options: (q.options || []).map(o => ({ value: o })) } }),
              ...(q.type === 'SCALE' && { scaleQuestion: { low: 1, high: q.scale || 5 } }),
            },
          },
        },
        location: { index: i },
      },
    };
    requests.push(questionItem);
  });

  if (requests.length > 0) {
    await forms.forms.batchUpdate({ formId, requestBody: { requests } });
  }

  const formLink = `https://docs.google.com/forms/d/${formId}/viewform`;
  const editLink = `https://docs.google.com/forms/d/${formId}/edit`;
  return {
    success: true, formId, title,
    formLink, editLink,
    questionCount: parsedQuestions.length,
    message: `Google Form "${title}" created with ${parsedQuestions.length} questions`,
  };
}

module.exports = { createForm };
