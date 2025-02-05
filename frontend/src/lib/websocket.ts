export class WebSocketClient {
    private ws: WebSocket | null = null;
    private readonly url: string;
    private readonly onMessage: (data: any) => void;
    private reconnectAttempts = 0;
    private maxReconnectAttempts = 5;
    private reconnectTimeout: NodeJS.Timeout | null = null;
  
    constructor(url: string, onMessage: (data: any) => void) {
      this.url = url;
      this.onMessage = onMessage;
    }
  
    connect(token: string) {
      try {
        this.ws = new WebSocket(`${this.url}?token=${token}`);
        this.setupEventListeners();
      } catch (error) {
        console.error('WebSocket connection error:', error);
        this.handleReconnection();
      }
    }
  
    private setupEventListeners() {
      if (!this.ws) return;
  
      this.ws.onopen = () => {
        console.log('WebSocket connected');
        this.reconnectAttempts = 0;
      };
  
      this.ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          this.onMessage(data);
        } catch (error) {
          console.error('Error parsing WebSocket message:', error);
        }
      };
  
      this.ws.onerror = (error) => {
        console.error('WebSocket error:', error);
      };
  
      this.ws.onclose = (event) => {
        console.log('WebSocket closed:', event.code, event.reason);
        this.handleReconnection();
      };
    }
  
    private handleReconnection() {
      if (this.reconnectAttempts < this.maxReconnectAttempts) {
        this.reconnectAttempts++;
        const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 30000);
        
        this.reconnectTimeout = setTimeout(() => {
          console.log(`Attempting to reconnect... (${this.reconnectAttempts}/${this.maxReconnectAttempts})`);
          const token = localStorage.getItem('accessToken');
          if (token) {
            this.connect(token);
          }
        }, delay);
      }
    }
  
    sendMessage(type: string, payload: any) {
      if (this.ws?.readyState === WebSocket.OPEN) {
        this.ws.send(JSON.stringify({ type, ...payload }));
      } else {
        console.warn('WebSocket is not connected. Message not sent:', { type, payload });
      }
    }
  
    disconnect() {
      if (this.reconnectTimeout) {
        clearTimeout(this.reconnectTimeout);
      }
      if (this.ws) {
        this.ws.close();
        this.ws = null;
      }
    }
  }