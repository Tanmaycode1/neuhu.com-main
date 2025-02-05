import { useEffect, useRef, useState, useCallback } from 'react';
import { WebSocketClient } from '../services/websocket';

interface WebSocketConfig {
  url: string;
  onMessage: (data: any) => void;
  onConnect?: () => void;
  onDisconnect?: () => void;
}

export const useWebSocket = (config: WebSocketConfig) => {
  const [isConnected, setIsConnected] = useState(false);
  const wsClientRef = useRef<WebSocketClient | null>(null);

  const handleConnect = useCallback(() => {
    setIsConnected(true);
    config.onConnect?.();
  }, [config]);

  const handleDisconnect = useCallback(() => {
    setIsConnected(false);
    config.onDisconnect?.();
  }, [config]);

  const handleMessage = useCallback((data: any) => {
    config.onMessage(data);
  }, [config.onMessage]);

  useEffect(() => {
    const token = localStorage.getItem('access_token');
    if (!token || !config.url) return;

    if (!wsClientRef.current) {
      wsClientRef.current = new WebSocketClient(
        config.url,
        handleMessage,
        handleConnect,
        handleDisconnect
      );
    }

    wsClientRef.current.connect(token);

    return () => {
      if (wsClientRef.current) {
        wsClientRef.current.disconnect();
        wsClientRef.current = null;
      }
    };
  }, [config.url, handleMessage, handleConnect, handleDisconnect]);

  const sendMessage = useCallback((type: string, payload: any) => {
    if (wsClientRef.current) {
      wsClientRef.current.sendMessage(type, payload);
    }
  }, []);

  return {
    isConnected,
    sendMessage
  };
};