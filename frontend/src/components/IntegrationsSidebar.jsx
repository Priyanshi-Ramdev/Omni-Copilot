import { useAuth } from '../hooks/useAuth';

const INTEGRATIONS = [
  { key: 'google', name: 'Google', icon: '🔵', desc: 'Drive, Docs, Gmail, Calendar, Meet, Forms', color: '#4285F4', oauthKey: 'google' },
  { key: 'notion', name: 'Notion', icon: '⬛', desc: 'Pages & Databases', color: '#ffffff', oauthKey: 'notion' },
  { key: 'slack',  name: 'Slack',  icon: '💬', desc: 'Channels & Messages', color: '#4A154B', oauthKey: 'slack' },
  { key: 'discord',name: 'Discord',icon: '🎮', desc: 'Alerts & Messages', color: '#5865F2', oauthKey: 'discord' },
  { key: 'zoom',   name: 'Zoom',   icon: '📹', desc: 'Meetings & Scheduling', color: '#2D8CFF', oauthKey: 'zoom' },
  { key: 'teams',  name: 'Teams',  icon: '💼', desc: 'Messages (coming soon)', color: '#6264A7', oauthKey: null },
];

export default function IntegrationsSidebar({ history, onNewChat, onSelectHistory }) {
  const { connected, connectService, isConnected } = useAuth();

  return (
    <aside className="sidebar">
      {/* Logo */}
      <div className="sidebar-logo">
        <div className="logo-icon">🧠</div>
        <div className="logo-text">
          <span className="logo-name">OMNI Copilot</span>
          <span className="logo-sub">Task Automation</span>
        </div>
      </div>

      {/* Integrations */}
      <div className="sidebar-section">
        <div className="sidebar-section-title">✦ Integrations</div>
        {INTEGRATIONS.map(int => {
          const conn = isConnected(int.key);
          return (
            <div key={int.key} className={`integration-tile ${conn ? 'active' : ''}`}>
              <div className="int-icon" style={{ background: int.color + '20', border: `1px solid ${int.color}30` }}>
                {int.icon}
              </div>
              <div className="int-info">
                <div className="int-name">{int.name}</div>
                <div className="int-status">{int.desc}</div>
              </div>
              {conn
                ? <div className="int-badge connected" title="Connected" />
                : int.oauthKey
                  ? <button className="connect-btn" onClick={() => connectService(int.oauthKey)}>Connect</button>
                  : <div className="int-badge disconnected" title="Coming Soon" />
              }
            </div>
          );
        })}
      </div>

      {/* History */}
      <div className="sidebar-section" style={{ paddingBottom: 4 }}>
        <div className="sidebar-section-title">⏱ Recent Chats</div>
      </div>
      <div className="sidebar-history">
        {history.length === 0 && (
          <div style={{ padding: '12px 10px', fontSize: 12, color: 'var(--text-muted)', textAlign: 'center' }}>
            No conversations yet
          </div>
        )}
        {history.map(h => (
          <div key={h.id} className="history-item" onClick={() => onSelectHistory(h.id)}>
            <div className="history-title">{h.title || 'Untitled'}</div>
            <div className="history-time">{formatTime(h.created_at)}</div>
          </div>
        ))}
      </div>

      {/* New Chat */}
      <button className="new-chat-btn" onClick={onNewChat}>
        ✦ New Task
      </button>
    </aside>
  );
}

function formatTime(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  const now = new Date();
  const diff = now - d;
  if (diff < 60000) return 'just now';
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
  return d.toLocaleDateString();
}
