const Groq = require('groq-sdk');
const { Conversation, Message, Token, Analytics } = require('./db/database');
const { v4: uuidv4 } = require('uuid');

// Tool Handlers
const googleDrive    = require('./tools/googleDrive');
const googleDocs     = require('./tools/googleDocs');
const gmail          = require('./tools/gmail');
const googleCalendar = require('./tools/googleCalendar');
const googleForms    = require('./tools/googleForms');
const googleMeet     = require('./tools/googleMeet');
const notion         = require('./tools/notion');
const slack          = require('./tools/slack');
const discord        = require('./tools/discord');
const zoom           = require('./tools/zoom');
const imageAnalysis  = require('./tools/imageAnalysis');
const codeFiles      = require('./tools/codeFiles');
const memory         = require('./tools/memory');
const webSearch      = require('./tools/webSearch');

// ── Tool Definitions (OpenAI / Groq format) ───────────────────────────────────
const TOOLS = [
  // Google Drive
  { type: 'function', function: { name: 'list_drive_files',    description: 'List files in Google Drive. Optional search query.', parameters: { type: 'object', properties: { query: { type: 'string', description: 'Drive search query, e.g. "name contains Report"' }, maxResults: { type: 'number' } }, required: [] } } },
  { type: 'function', function: { name: 'create_drive_folder', description: 'Create a folder in Google Drive.',                    parameters: { type: 'object', properties: { name: { type: 'string' }, parentId: { type: 'string' } }, required: ['name'] } } },
  { type: 'function', function: { name: 'upload_to_drive',     description: 'Upload a text file to Google Drive.',                 parameters: { type: 'object', properties: { name: { type: 'string' }, content: { type: 'string' }, mimeType: { type: 'string' }, folderId: { type: 'string' } }, required: ['name', 'content'] } } },
  // Google Docs
  { type: 'function', function: { name: 'create_google_doc', description: 'Create a Google Doc with title and content.',     parameters: { type: 'object', properties: { title: { type: 'string' }, content: { type: 'string' } }, required: ['title', 'content'] } } },
  { type: 'function', function: { name: 'read_google_doc',   description: 'Read a Google Doc by ID or name.',                parameters: { type: 'object', properties: { documentId: { type: 'string' }, name: { type: 'string' } }, required: [] } } },
  // Gmail
  { type: 'function', function: { name: 'send_email',  description: 'Send an email via Gmail.',              parameters: { type: 'object', properties: { to: { type: 'string' }, subject: { type: 'string' }, body: { type: 'string', description: 'HTML or plain text body' }, cc: { type: 'string' } }, required: ['to', 'subject', 'body'] } } },
  { type: 'function', function: { name: 'read_emails', description: 'Read recent emails from Gmail inbox.',  parameters: { type: 'object', properties: { maxResults: { type: 'number' }, query: { type: 'string', description: 'Gmail search query e.g. "is:unread"' } }, required: [] } } },
  // Google Calendar
  { type: 'function', function: { name: 'create_calendar_event', description: 'Create a Google Calendar event.',     parameters: { type: 'object', properties: { title: { type: 'string' }, description: { type: 'string' }, startDateTime: { type: 'string', description: 'ISO 8601 e.g. 2024-12-25T14:00:00' }, endDateTime: { type: 'string' }, attendees: { type: 'string', description: 'Comma-separated emails' }, location: { type: 'string' } }, required: ['title', 'startDateTime', 'endDateTime'] } } },
  { type: 'function', function: { name: 'list_calendar_events',  description: 'List upcoming Google Calendar events.', parameters: { type: 'object', properties: { maxResults: { type: 'number' }, timeMin: { type: 'string' }, timeMax: { type: 'string' } }, required: [] } } },
  // Google Meet
  { type: 'function', function: { name: 'create_google_meet', description: 'Schedule a Google Meet video call via Calendar.', parameters: { type: 'object', properties: { title: { type: 'string' }, startDateTime: { type: 'string' }, endDateTime: { type: 'string' }, attendees: { type: 'string' }, description: { type: 'string' } }, required: ['title', 'startDateTime', 'endDateTime'] } } },
  // Google Forms
  { type: 'function', function: { name: 'create_google_form', description: 'Create a Google Form with questions.', parameters: { type: 'object', properties: { title: { type: 'string' }, description: { type: 'string' }, questions: { type: 'string', description: 'JSON array: [{title, type, required, options}]. Types: TEXT, MULTIPLE_CHOICE, CHECKBOX, SCALE' } }, required: ['title', 'questions'] } } },
  // Notion
  { type: 'function', function: { name: 'create_notion_page', description: 'Create a Notion page with markdown content.', parameters: { type: 'object', properties: { title: { type: 'string' }, content: { type: 'string', description: 'Markdown content' }, parentPageId: { type: 'string' } }, required: ['title', 'content'] } } },
  { type: 'function', function: { name: 'search_notion',      description: 'Search Notion workspace. Query should be plain text keywords (e.g. "my folder").', parameters: { type: 'object', properties: { query: { type: 'string' } }, required: ['query'] } } },
  { type: 'function', function: { name: 'read_notion_page',   description: 'Read the text content of a specific Notion page.', parameters: { type: 'object', properties: { pageId: { type: 'string' } }, required: ['pageId'] } } },
  { type: 'function', function: { name: 'list_notion_pages',  description: 'List recent Notion pages.',                   parameters: { type: 'object', properties: { limit: { type: 'number' } }, required: [] } } },
  // Slack
  { type: 'function', function: { name: 'send_slack_message',   description: 'Send a message to a Slack channel or user.', parameters: { type: 'object', properties: { channel: { type: 'string', description: 'Channel name e.g. #general or user ID' }, message: { type: 'string' } }, required: ['channel', 'message'] } } },
  { type: 'function', function: { name: 'list_slack_channels',  description: 'List Slack channels.',                       parameters: { type: 'object', properties: { limit: { type: 'number' } }, required: [] } } },
  { type: 'function', function: { name: 'read_slack_messages',  description: 'Read recent Slack channel messages.',        parameters: { type: 'object', properties: { channel: { type: 'string' }, limit: { type: 'number' } }, required: ['channel'] } } },
  // Discord
  { type: 'function', function: { name: 'send_discord_message', description: 'Send a Discord message to a channel.', parameters: { type: 'object', properties: { channelId: { type: 'string' }, message: { type: 'string' } }, required: ['channelId', 'message'] } } },
  // Image Analysis
  { type: 'function', function: { name: 'analyze_image', description: 'Analyze an uploaded image with AI vision.', parameters: { type: 'object', properties: { imageData: { type: 'string', description: 'Base64 image data' }, mimeType: { type: 'string' }, prompt: { type: 'string' } }, required: ['imageData', 'prompt'] } } },
  // Code Files
  { type: 'function', function: { name: 'read_code_file',  description: 'Read a local file.',           parameters: { type: 'object', properties: { filePath: { type: 'string' } }, required: ['filePath'] } } },
  { type: 'function', function: { name: 'write_code_file', description: 'Write/create a local file.',  parameters: { type: 'object', properties: { filePath: { type: 'string' }, content: { type: 'string' } }, required: ['filePath', 'content'] } } },
  { type: 'function', function: { name: 'list_directory',  description: 'List a local directory.',     parameters: { type: 'object', properties: { dirPath: { type: 'string' } }, required: ['dirPath'] } } },
  // Zoom
  { type: 'function', function: { name: 'create_zoom_meeting', description: 'Schedule a Zoom meeting.', parameters: { type: 'object', properties: { topic: { type: 'string' }, startDateTime: { type: 'string', description: 'ISO 8601 string' }, duration: { type: 'number', description: 'Duration in minutes' }, agenda: { type: 'string' } }, required: ['topic', 'startDateTime'] } } },
  // Intelligence
  { type: 'function', function: { name: 'upsert_memory', description: 'Save a fact about the user for long-term memory.', parameters: { type: 'object', properties: { key: { type: 'string', description: 'Fact name, e.g. favorite_color' }, value: { type: 'string', description: 'The fact value' }, category: { type: 'string', description: 'Category e.g. preference, work, bio' } }, required: ['key', 'value'] } } },
  { type: 'function', function: { name: 'search_memory', description: 'Search long-term memory for previously saved user facts.', parameters: { type: 'object', properties: { query: { type: 'string', description: 'Search term or key' } }, required: ['query'] } } },
  { type: 'function', function: { name: 'web_search',    description: 'Search the internet for real-time information.', parameters: { type: 'object', properties: { query: { type: 'string' }, search_depth: { type: 'string', enum: ['basic', 'advanced'] } }, required: ['query'] } } },
];

// ── Tool Executor Map ─────────────────────────────────────────────────────────
const TOOL_MAP = {
  list_drive_files:     googleDrive.listFiles,
  create_drive_folder:  googleDrive.createFolder,
  upload_to_drive:      googleDrive.uploadFile,
  create_google_doc:    googleDocs.createDoc,
  read_google_doc:      googleDocs.readDoc,
  send_email:           gmail.sendEmail,
  read_emails:          gmail.readEmails,
  create_calendar_event:googleCalendar.createEvent,
  list_calendar_events: googleCalendar.listEvents,
  create_google_meet:   googleMeet.createMeeting,
  create_google_form:   googleForms.createForm,
  create_notion_page:   notion.createPage,
  search_notion:        notion.searchPages,
  list_notion_pages:    notion.listPages,
  read_notion_page:     notion.readPage,
  send_slack_message:   slack.sendMessage,
  list_slack_channels:  slack.listChannels,
  read_slack_messages:  slack.readMessages,
  send_discord_message: discord.sendMessage,
  analyze_image:        imageAnalysis.analyzeImage,
  read_code_file:       codeFiles.readFile,
  write_code_file:      codeFiles.writeFile,
  list_directory:       codeFiles.listDirectory,
  create_zoom_meeting:  zoom.createMeeting,
  upsert_memory:        memory.upsertMemory,
  search_memory:        memory.searchMemory,
  web_search:           webSearch.webSearch,
};

// ── System Prompt ─────────────────────────────────────────────────────────────
const SYSTEM_PROMPT = `You are OMNI Copilot, an intelligent task automation assistant. You are exceptionally detailed, thorough, and professional.

Core Intelligence Rules:
- MEMORY: You have a long-term memory. Use 'upsert_memory' to save important facts about the user (preferences, bio, recurring project names) so you don't forget them in future sessions.
- RECALL: Use 'search_memory' if you suspect you've been told something before but it's not in the current chat history. 
- REAL-TIME DATA: Use 'web_search' to find current information, news, or technical documentation you aren't sure about. 

Operating Rules:
- PROVIDE DEPTH: When summarizing emails or documents, provide high-fidelity, multi-paragraph summaries. Extract specific names, dates, amounts, and action items. NEVER provide one-line generic summaries.
- FORMATTING: Use markdown tables, bold text, and bullet points to make information easy to read.
- If a service is not connected, clearly say so and tell the user to click Connect in the sidebar.
- Always include direct links to created resources.
- When listing/reading emails, format each email link strictly as a markdown link like: [View in Gmail](url).
- Be proactive (e.g., after creating a Meet, offer to email the link to attendees).
- Current datetime (UTC): ${new Date().toISOString()}`;

const SENSITIVE_TOOLS = [
  'send_email', 'create_drive_folder', 'upload_to_drive',
  'create_google_doc', 'create_calendar_event', 'create_google_meet',
  'create_google_form', 'create_notion_page', 'send_slack_message',
  'send_discord_message', 'write_code_file', 'create_zoom_meeting'
];

// ── Main Execution Engine ─────────────────────────────────────────────────────
async function execute({ message, conversationId, attachments, userId, onStep, onChunk, onComplete, onError, onRequestAction }) {
  const convId = conversationId || uuidv4();
  if (!userId) throw new Error('User ID is required for execution');

  // Load conversation history (ensure it belongs to the user)
  let history = [];
  try {
    const rows = await Message.find({ conversation_id: convId }).sort({ created_at: 1 }).limit(20);
    // Note: In a real multi-user app, we'd verify the Conversation belongs to the User here too.
    history = rows.map(r => ({ role: r.role === 'model' ? 'assistant' : r.role, content: r.content }));
  } catch {}

  // Save user message (Upsert conversation with userId)
  await Conversation.findOneAndUpdate(
    { id: convId },
    { userId, title: message.slice(0, 60), updated_at: new Date() },
    { upsert: true, setDefaultsOnInsert: true }
  );
  
  await new Message({
    id: uuidv4(),
    conversation_id: convId,
    role: 'user',
    content: message,
    created_at: new Date()
  }).save();

  // Simplify history for better context (last 6 messages)
  const recentHistory = history.slice(-6).map(msg => {
    if (typeof msg.content === 'string' && msg.content.length > 5000) {
      return { ...msg, content: msg.content.substring(0, 5000) + "..." };
    }
    return msg;
  });

  const messages = [
    { role: 'system', content: SYSTEM_PROMPT },
    ...recentHistory,
    { role: 'user', content: buildUserContent(message, attachments) },
  ];

    const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
    let fullResponse = '';

    try {
        onStep({ id: 'thinking', type: 'thinking', message: 'Analyzing your request...' });

        let continueLoop = true;
        while (continueLoop) {
            const response = await groq.chat.completions.create({
                model: 'llama-3.3-70b-versatile',
                messages,
                tools: TOOLS,
                tool_choice: 'auto',
                max_tokens: 8192,
                temperature: 0.7,
            });

            const choice = response.choices[0];
            const assistantMsg = choice.message;
            messages.push(assistantMsg);

            if (!assistantMsg.tool_calls || assistantMsg.tool_calls.length === 0) {
                fullResponse = assistantMsg.content || '';
                continueLoop = false;
                break;
            }

      // Execute each tool call
      for (const toolCall of assistantMsg.tool_calls) {
        const fnName = toolCall.function.name;
        const toolId = toolCall.id;
        let args = {};
        try { args = JSON.parse(toolCall.function.arguments || '{}'); } catch {}

        onStep({ id: toolId, type: 'tool', message: `Running: ${formatToolName(fnName)}`, tool: fnName, args });

        let result;
        try {
          const handler = TOOL_MAP[fnName];
          if (!handler) throw new Error(`Unknown tool: ${fnName}`);
          
          let executeArgs = args;
             if (SENSITIVE_TOOLS.includes(fnName) && onRequestAction) {
                onStep({ id: toolId, type: 'tool', message: `⚠️ Waiting for your approval to: ${formatToolName(fnName)}...`, tool: fnName, args });
                const userResponse = await onRequestAction({ id: toolId, tool: fnName, args });
                if (userResponse.status === 'rejected') {
                    throw new Error("Action cancelled by user.");
                }
                if (userResponse.args) {
                    executeArgs = userResponse.args;
                }
                // Reset step message to standard running after approval
                onStep({ id: toolId, type: 'tool', message: `Running: ${formatToolName(fnName)}`, tool: fnName, args: executeArgs });
             } 
          
          // Pass userId to tool handlers that need it
          result = await handler({ ...executeArgs, userId });
          onStep({ id: toolId, type: 'tool_success', message: `✓ ${formatToolName(fnName)} completed`, tool: fnName, result });
          
          // Log to Analytics (linked to user)
          await new Analytics({
            userId,
            event_type: 'tool_hit',
            tool_name: fnName,
            status: 'success',
            metadata: { conversation_id: convId }
          }).save().catch(e => console.error('[Analytics Log Error]', e));
        } catch (err) {
          result = { error: err.message };
          onStep({ id: toolId, type: 'tool_error', message: `✗ ${formatToolName(fnName)}: ${err.message}`, tool: fnName });
        }

        // Feed tool result back
        let content = JSON.stringify(result);
        if (content.length > 25000) {
          content = content.substring(0, 25000) + "... [RESULT TRUNCATED DUE TO SIZE]";
        }
        messages.push({
          role: 'tool',
          tool_call_id: toolCall.id,
          content: content,
        });
      }
    }

    // ── Stream the final response word by word ────────────────────────────────
    const words = fullResponse.split(/(\s+)/);
    for (const chunk of words) {
      onChunk({ text: chunk });
      await sleep(12);
    }

    // Save assistant response
    await new Message({
      id: uuidv4(),
      conversation_id: convId,
      role: 'model',
      content: fullResponse,
      created_at: new Date()
    }).save();

    onComplete({ text: fullResponse, conversationId: convId });

  } catch (err) {
    console.error('[Orchestrator Error]', err.message);
    onError(err);
  }
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function buildUserContent(message, attachments) {
  if (attachments && attachments.some(a => a.mimeType?.startsWith('image/'))) {
    const parts = [{ type: 'text', text: message }];
    for (const att of attachments) {
      if (att.mimeType?.startsWith('image/')) {
        parts.push({ type: 'image_url', image_url: { url: `data:${att.mimeType};base64,${att.data}` } });
      }
    }
    return parts;
  }
  return message;
}

function formatToolName(name) {
  return name.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
}

function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

module.exports = { execute };

