import { useState, useRef, useEffect, useCallback } from 'react';
import { v4 as uuidv4 } from 'uuid';
import MessageBubble from './MessageBubble';
import { useSocket } from '../hooks/useSocket';

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001';

const QUICK_CHIPS = [
  { label: '📁 List my Drive files', text: 'List my recent Google Drive files' },
  { label: '📧 Read inbox', text: 'Show me my latest emails from Gmail' },
  { label: '📅 Today\'s schedule', text: 'What\'s on my calendar today?' },
  { label: '✏️ Create a doc', text: 'Create a Google Doc with a project kickoff agenda for a new software project' },
  { label: '⬛ New Notion page', text: 'Create a Notion page called "Weekly Goals" with sections for work, personal, and learning' },
  { label: '💬 Send Slack message', text: 'Send a message to #general on Slack saying "Team standup in 5 minutes!"' },
];

export default function ChatWindow({ conversationId, onConversationStart }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [attachments, setAttachments] = useState([]);
  const [isDragging, setIsDragging] = useState(false);
  const messagesEndRef = useRef(null);
  const textareaRef = useRef(null);
  const fileInputRef = useRef(null);
  const activeConvId = useRef(conversationId || uuidv4());
  const streamingMsgId = useRef(null);
  const { sendMessage, on, off, socket } = useSocket();

  useEffect(() => {
    if (conversationId) activeConvId.current = conversationId;
  }, [conversationId]);

  // Socket event listeners
  useEffect(() => {
    const removeStep = on('chat:step', (step) => {
      setMessages(prev => {
        const idx = prev.findIndex(m => m.id === streamingMsgId.current);
        if (idx === -1) return prev;
        const updated = [...prev];
        const currentSteps = [...(updated[idx].steps || [])];
        const stepIdx = currentSteps.findIndex(s => s.id === step.id);
        if (stepIdx >= 0) {
          currentSteps[stepIdx] = step;
        } else {
          currentSteps.push(step);
        }
        updated[idx] = { ...updated[idx], steps: currentSteps };
        return updated;
      });
    });

    const removeChunk = on('chat:chunk', ({ text }) => {
      setMessages(prev => {
        const idx = prev.findIndex(m => m.id === streamingMsgId.current);
        if (idx === -1) return prev;
        const updated = [...prev];
        updated[idx] = { ...updated[idx], content: (updated[idx].content || '') + text, isStreaming: true };
        return updated;
      });
    });

    const removeComplete = on('chat:complete', ({ conversationId: cid }) => {
      setMessages(prev => {
        const idx = prev.findIndex(m => m.id === streamingMsgId.current);
        if (idx === -1) return prev;
        const updated = [...prev];
        updated[idx] = { ...updated[idx], isStreaming: false };
        return updated;
      });
      setIsLoading(false);
      streamingMsgId.current = null;
      if (cid && onConversationStart) onConversationStart(cid);
    });

    const removeError = on('chat:error', ({ error }) => {
      setMessages(prev => {
        const idx = prev.findIndex(m => m.id === streamingMsgId.current);
        if (idx === -1) return [...prev, {
          id: uuidv4(), role: 'assistant',
          content: `❌ Error: ${error}`, timestamp: new Date().toISOString(),
        }];
        const updated = [...prev];
        updated[idx] = { ...updated[idx], content: `❌ Error: ${error}`, isStreaming: false };
        return updated;
      });
      setIsLoading(false);
      streamingMsgId.current = null;
    });

    const removeActionRequired = on('chat:action_required', (action) => {
      setMessages(prev => {
        const idx = prev.findIndex(m => m.id === streamingMsgId.current);
        if (idx === -1) return prev;
        const updated = [...prev];
        updated[idx] = { ...updated[idx], pendingAction: action };
        return updated;
      });
    });

    return () => { removeStep?.(); removeChunk?.(); removeComplete?.(); removeError?.(); removeActionRequired?.(); };
  }, [on, off, onConversationStart]);

  // Auto-scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 160) + 'px';
    }
  }, [input]);

  const handleSend = useCallback(async () => {
    const text = input.trim();
    if (!text && attachments.length === 0) return;
    if (isLoading) return;

    const userMsg = {
      id: uuidv4(), role: 'user',
      content: text, attachments, timestamp: new Date().toISOString(),
    };
    const assistantMsgId = uuidv4();
    const assistantMsg = {
      id: assistantMsgId, role: 'assistant',
      content: '', steps: [], isStreaming: false, timestamp: new Date().toISOString(),
    };

    setMessages(prev => [...prev, userMsg, assistantMsg]);
    streamingMsgId.current = assistantMsgId;
    setInput('');
    setAttachments([]);
    setIsLoading(true);

    sendMessage({
      message: text,
      conversationId: activeConvId.current,
      attachments: attachments.map(a => ({ name: a.name, mimeType: a.mimeType, data: a.data })),
    });
  }, [input, attachments, isLoading, sendMessage]);

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleFileUpload = async (files) => {
    for (const file of Array.from(files)) {
      const formData = new FormData();
      formData.append('file', file);
      try {
        const res = await fetch(`${BACKEND_URL}/api/upload`, { method: 'POST', body: formData });
        const data = await res.json();
        setAttachments(prev => [...prev, { ...data, id: uuidv4() }]);
      } catch (e) { console.error('Upload failed', e); }
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    handleFileUpload(e.dataTransfer.files);
  };

  const handleChip = (text) => {
    setInput(text);
    textareaRef.current?.focus();
  };

  const showWelcome = messages.length === 0;

  return (
    <div className="chat-main"
      onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
      onDragLeave={() => setIsDragging(false)}
      onDrop={handleDrop}
      style={isDragging ? { outline: '2px dashed var(--primary)', outlineOffset: '-8px' } : {}}
    >
      {/* Header */}
      <div className="chat-header">
        <div>
          <div className="chat-header-title">🧠 OMNI Copilot</div>
          <div className="chat-header-sub">Your intelligent task automation assistant</div>
        </div>
        <div className="header-status">
          <div className="header-status-dot" />
          AI Ready
        </div>
      </div>

      {/* Messages */}
      <div className="messages-area">
        {showWelcome ? (
          <div className="welcome-screen">
            <div className="welcome-logo">🧠</div>
            <h1 className="welcome-title">What can I do for you?</h1>
            <p className="welcome-sub">
              I can automate tasks across Google Drive, Gmail, Calendar, Notion, Slack, and more.
              Just describe what you need in plain English.
            </p>
            <div className="quick-chips">
              {QUICK_CHIPS.map((chip, i) => (
                <button key={i} className="chip" onClick={() => handleChip(chip.text)}>
                  {chip.label}
                </button>
              ))}
            </div>
          </div>
        ) : (
          messages.map(msg => (
            <MessageBubble 
              key={msg.id} 
              message={msg} 
              onActionRespond={(response) => {
                if (socket) {
                   socket.emit(`chat:action_response:${msg.pendingAction.id}`, response);
                }
              }} 
            />
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Attachments Preview */}
      {attachments.length > 0 && (
        <div className="attachments-preview">
          {attachments.map(att => (
            <div key={att.id} className="attachment-chip"
              onClick={() => setAttachments(prev => prev.filter(a => a.id !== att.id))}>
              {att.mimeType?.startsWith('image/') ? '🖼️' : '📎'} {att.name} ✕
            </div>
          ))}
        </div>
      )}

      {/* Input */}
      <div className="input-area">
        <div className="input-box">
          <textarea
            ref={textareaRef}
            className="input-textarea"
            placeholder="Describe your task... (e.g. 'Send an email to john@email.com about the project update')"
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            rows={1}
            disabled={isLoading}
          />
          <div className="input-actions">
            <input ref={fileInputRef} type="file" multiple style={{ display: 'none' }}
              onChange={e => handleFileUpload(e.target.files)} />
            <button className="icon-btn" title="Attach file"
              onClick={() => fileInputRef.current.click()}>📎</button>
            <button className="icon-btn" title="Upload image"
              onClick={() => { fileInputRef.current.accept = 'image/*'; fileInputRef.current.click(); }}>🖼️</button>
            <button className="send-btn" onClick={handleSend} disabled={isLoading || (!input.trim() && attachments.length === 0)}>
              {isLoading ? '⏳' : '➤'}
            </button>
          </div>
        </div>
        <div className="input-footer">
          <span>Press Enter to send · Shift+Enter for new line · Drag & drop files</span>
        </div>
      </div>
    </div>
  );
}
