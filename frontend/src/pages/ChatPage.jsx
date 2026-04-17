import { useState, useEffect } from 'react';
import { v4 as uuidv4 } from 'uuid';
import ChatWindow from '../components/ChatWindow';
import IntegrationsSidebar from '../components/IntegrationsSidebar';

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001';

export default function ChatPage() {
  const [conversationId, setConversationId] = useState(uuidv4());
  const [history, setHistory] = useState([]);

  const fetchHistory = async () => {
    try {
      const res = await fetch(`${BACKEND_URL}/api/history`);
      const data = await res.json();
      setHistory(Array.isArray(data) ? data : []);
    } catch {}
  };

  useEffect(() => { fetchHistory(); }, []);

  const handleNewChat = () => {
    setConversationId(uuidv4());
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
        onSelectHistory={(id) => setConversationId(id)}
      />
      <ChatWindow
        conversationId={conversationId}
        onConversationStart={handleConversationStart}
      />
    </div>
  );
}
