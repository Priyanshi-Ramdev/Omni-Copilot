import { useState, useEffect, useCallback } from 'react';

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001';

export function useAuth() {
  const [connected, setConnected] = useState({});
  const [loading, setLoading] = useState(true);

  const fetchStatus = useCallback(async () => {
    try {
      const res = await fetch(`${BACKEND_URL}/api/auth/status`);
      const data = await res.json();
      setConnected(data.connected || {});
    } catch (e) {
      console.error('Auth status fetch failed:', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStatus();

    // Listen for OAuth popups completing
    const handler = (event) => {
      if (event.origin !== BACKEND_URL && !event.data) return;
      if (event.data?.type === 'OAUTH_SUCCESS') {
        fetchStatus();
      }
    };
    window.addEventListener('message', handler);
    return () => window.removeEventListener('message', handler);
  }, [fetchStatus]);

  const connectService = useCallback((service) => {
    const urls = {
      google: `${BACKEND_URL}/auth/google`,
      notion: `${BACKEND_URL}/auth/notion`,
      slack:  `${BACKEND_URL}/auth/slack`,
      zoom:   `${BACKEND_URL}/auth/zoom`,
    };
    const url = urls[service];
    if (!url) return;
    const popup = window.open(url, 'oauth', 'width=500,height=600,scrollbars=yes');
    if (!popup) alert('Please allow popups for OAuth login.');
  }, [fetchStatus]);

  const disconnectService = useCallback(async (service) => {
    await fetch(`${BACKEND_URL}/api/auth/disconnect/${service}`, { method: 'POST' });
    fetchStatus();
  }, [fetchStatus]);

  const isConnected = useCallback((service) => !!connected[service]?.connected, [connected]);

  return { connected, loading, connectService, disconnectService, isConnected, refresh: fetchStatus };
}
