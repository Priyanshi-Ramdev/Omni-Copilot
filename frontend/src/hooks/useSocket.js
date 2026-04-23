import { useEffect, useRef, useCallback } from 'react';
import { io } from 'socket.io-client';

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001';

let socket = null;

export function useSocket() {
  const socketRef = useRef(null);

  useEffect(() => {
    if (!socketRef.current) {
      const token = localStorage.getItem('omni_token');
      socket = io(BACKEND_URL, { 
        transports: ['websocket', 'polling'],
        auth: { token }
      });
      socketRef.current = socket;
    }
    return () => {
      // Keep socket alive for reuse
    };
  }, []);

  const sendMessage = useCallback((payload) => {
    if (socketRef.current) {
      socketRef.current.emit('chat:message', payload);
    }
  }, []);

  const on = useCallback((event, handler) => {
    if (socketRef.current) {
      socketRef.current.on(event, handler);
    }
    return () => {
      if (socketRef.current) socketRef.current.off(event, handler);
    };
  }, []);

  const off = useCallback((event, handler) => {
    if (socketRef.current) socketRef.current.off(event, handler);
  }, []);

  return { sendMessage, on, off, socket: socketRef.current };
}
