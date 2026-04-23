import { useState, useEffect, useCallback } from 'react';

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001';

export function useAuth() {
  const [user, setUser] = useState(null);
  const [connected, setConnected] = useState({});
  const [loading, setLoading] = useState(true);

  const getHeaders = useCallback(() => {
    const token = localStorage.getItem('omni_token');
    return {
      'Content-Type': 'application/json',
      ...(token ? { 'Authorization': `Bearer ${token}` } : {})
    };
  }, []);

  // Define logout first so fetchStatus can safely reference it
  const logout = useCallback(() => {
    localStorage.removeItem('omni_token');
    localStorage.removeItem('omni_user');
    window.location.href = '/auth';
  }, []);

  const fetchStatus = useCallback(async () => {
    const token = localStorage.getItem('omni_token');
    if (!token) {
      setLoading(false);
      return;
    }
    try {
      const res = await fetch(`${BACKEND_URL}/api/auth/status`, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        }
      });
      if (res.status === 401) {
        logout();
        return;
      }
      const data = await res.json();
      setConnected(data.connected || {});
    } catch (e) {
      console.error('Auth status fetch failed:', e);
    } finally {
      setLoading(false);
    }
  }, [logout]);

  useEffect(() => {
    const savedUser = localStorage.getItem('omni_user');
    if (savedUser) {
      try {
        setUser(JSON.parse(savedUser));
      } catch {
        localStorage.removeItem('omni_user');
      }
    }

    fetchStatus();

    const handler = (event) => {
      console.log('[Auth] Message received:', event.data);
      if (!event.data) return;
      if (event.data?.type === 'OAUTH_SUCCESS') {
        fetchStatus();
      } else if (event.data?.type === 'OAUTH_ERROR') {
        alert(`Connection Failed: ${event.data.error || 'Unknown error'}`);
      }
    };
    window.addEventListener('message', handler);
    return () => window.removeEventListener('message', handler);
  }, [fetchStatus]);

  const connectService = useCallback((service) => {
    const token = localStorage.getItem('omni_token');
    const urls = {
      google: `${BACKEND_URL}/auth/google?token=${token}`,
      notion: `${BACKEND_URL}/auth/notion?token=${token}`,
      slack:  `${BACKEND_URL}/auth/slack?token=${token}`,
      zoom:   `${BACKEND_URL}/auth/zoom?token=${token}`,
    };
    const url = urls[service];
    if (!url) return;
    const popup = window.open(url, 'oauth', 'width=500,height=600,scrollbars=yes');
    if (!popup) alert('Please allow popups for OAuth login.');
  }, []);

  const disconnectService = useCallback(async (service) => {
    await fetch(`${BACKEND_URL}/api/auth/disconnect/${service}`, {
      method: 'POST',
      headers: getHeaders()
    });
    fetchStatus();
  }, [fetchStatus, getHeaders]);

  const isConnected = useCallback((service) => !!connected[service]?.connected, [connected]);

  return {
    user,
    connected,
    loading,
    connectService,
    disconnectService,
    isConnected,
    logout,
    getHeaders,
    refresh: fetchStatus
  };
}
