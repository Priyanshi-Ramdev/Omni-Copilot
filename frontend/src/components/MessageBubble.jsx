import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import ToolStatusCard from './ToolStatusCard';
import ActionReviewCard from './ActionReviewCard';

export default function MessageBubble({ message, onActionRespond }) {
  const { role, content, steps, isStreaming, attachments, timestamp, pendingAction } = message;
  const isUser = role === 'user';

  return (
    <div className={`message-row ${isUser ? 'user' : 'assistant'}`}>
      <div className={`msg-avatar ${isUser ? 'user' : 'assistant'}`}>
        {isUser ? '👤' : '🧠'}
      </div>
      <div className="msg-content">
        {/* Tool Steps (for assistant) */}
        {!isUser && steps && steps.length > 0 && <ToolStatusCard steps={steps} />}

        {/* Attachments (for user messages) */}
        {isUser && attachments && attachments.length > 0 && (
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 6 }}>
            {attachments.map((att, i) => (
              <div key={i} style={{
                padding: '4px 10px', background: 'var(--bg-elevated)',
                border: '1px solid var(--border)', borderRadius: 8,
                fontSize: 11, color: 'var(--text-secondary)',
                display: 'flex', alignItems: 'center', gap: 4
              }}>
                {att.mimeType?.startsWith('image/') ? '🖼️' : '📎'} {att.name}
              </div>
            ))}
          </div>
        )}

        {/* Main Bubble */}
        {(content || isStreaming) && (
          <div className={`msg-bubble ${isUser ? 'user' : 'assistant'}`}>
            {isUser ? (
              <span>{content}</span>
            ) : (
              <>
                <ReactMarkdown remarkPlugins={[remarkGfm]}>{content || ''}</ReactMarkdown>
                {isStreaming && <span className="cursor-blink" />}
              </>
            )}
          </div>
        )}

        {/* Action Review Form */}
        {!isUser && pendingAction && onActionRespond && (
            <ActionReviewCard key={pendingAction.id} action={pendingAction} onRespond={onActionRespond} />
        )}

        <span className="msg-time">{formatTime(timestamp)}</span>
      </div>
    </div>
  );
}

function formatTime(ts) {
  if (!ts) return '';
  const d = new Date(ts);
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}
