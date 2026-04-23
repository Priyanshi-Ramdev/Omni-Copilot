import { useState, useEffect } from 'react';
import { v4 as uuidv4 } from 'uuid';
import ChatWindow from '../components/ChatWindow';
import IntegrationsSidebar from '../components/IntegrationsSidebar';
import Dashboard from '../components/Dashboard';
import { useAuth } from '../hooks/useAuth';

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001';

export default function ChatPage() {
  const { getHeaders } = useAuth();
  const [conversationId, setConversationId] = useState(uuidv4());
  const [history, setHistory] = useState([]);
  const [view, setView] = useState('chat'); // 'chat' or 'dashboard'

  // Sync view state with URL hash
  useEffect(() => {
    const handleHash = () => {
      const hash = window.location.hash.replace('#', '');
      if (hash === 'dashboard') setView('dashboard');
      else setView('chat');
    };
    window.addEventListener('hashchange', handleHash);
    handleHash();
    return () => window.removeEventListener('hashchange', handleHash);
  }, []);

  const fetchHistory = async () => {
    try {
      const res = await fetch(`${BACKEND_URL}/api/history`, { headers: getHeaders() });
      const data = await res.json();
      setHistory(Array.isArray(data) ? data : []);
    } catch {}
  };

  useEffect(() => { fetchHistory(); }, [getHeaders]);

  const handleNewChat = () => {
    setConversationId(uuidv4());
    window.location.hash = 'chat';
  };

  const handleConversationStart = (cid) => {
    fetchHistory();
  };

  return (
    <div className="app-layout">
      <div className="bg-orbs" />
      <IntegrationsSidebar
        history={history}
        onNewChat={handleNewChat}
        onSelectHistory={(id) => {
          setConversationId(id);
          window.location.hash = 'chat';
        }}
      />
      
      {view === 'dashboard' ? (
        <Dashboard />
      ) : (
        <ChatWindow
          conversationId={conversationId}
          onConversationStart={handleConversationStart}
        />
      )}
    </div>
  );
}
