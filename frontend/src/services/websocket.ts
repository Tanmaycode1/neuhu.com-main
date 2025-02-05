export class WebSocketClient {
  private ws: WebSocket | null = null;
  private readonly url: string;
  private readonly onMessage: (data: any) => void;
  private readonly onConnect: () => void;
  private readonly onDisconnect: () => void;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectTimeout: NodeJS.Timeout | null = null;
  private isConnecting = false;

  constructor(
    url: string, 
    onMessage: (data: any) => void,
    onConnect: () => void,
    onDisconnect: () => void
  ) {
    this.url = url;
    this.onMessage = onMessage;
    this.onConnect = onConnect;
    this.onDisconnect = onDisconnect;
  }

  connect(token: string) {
    if (!this.url || this.isConnecting || this.ws?.readyState === WebSocket.OPEN) {
      return;
    }

    try {
      this.isConnecting = true;
      console.log('Connecting to WebSocket:', this.url);
      this.ws = new WebSocket(this.url);
      this.setupEventListeners();
    } catch (error) {
      console.error('WebSocket connection error:', error);
      this.handleReconnection();
    }
  }

  private setupEventListeners() {
    if (!this.ws) return;

    this.ws.onopen = () => {
      console.log('WebSocket connected to:', this.url);
      this.reconnectAttempts = 0;
      this.isConnecting = false;
      this.onConnect();
    };

    this.ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        console.log('WebSocket received:', data);
        this.onMessage(data);
      } catch (error) {
        console.error('Error parsing WebSocket message:', error);
      }
    };

    this.ws.onerror = (error) => {
      console.error('WebSocket error:', error);
      this.onDisconnect();
    };

    this.ws.onclose = (event) => {
      console.log('WebSocket closed:', event.code, event.reason);
      this.onDisconnect();
      if (!this.isConnecting) {
        this.handleReconnection();
      }
    };
  }

  private handleReconnection() {
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
    }

    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 30000);
      
      console.log(`Attempting to reconnect... (${this.reconnectAttempts}/${this.maxReconnectAttempts})`);
      
      this.reconnectTimeout = setTimeout(() => {
        const token = localStorage.getItem('access_token');
        if (token) {
          this.connect(token);
        }
      }, delay);
    } else {
      console.warn('Max reconnection attempts reached');
      this.onDisconnect();
    }
  }

  sendMessage(type: string, payload: any) {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      console.warn('WebSocket is not connected. Message not sent:', { type, payload });
      const token = localStorage.getItem('access_token');
      if (token) {
        this.connect(token);
      }
      return;
    }

    try {
      const message = JSON.stringify({ type, ...payload });
      console.log('Sending WebSocket message:', message);
      this.ws.send(message);
    } catch (error) {
      console.error('Error sending WebSocket message:', error);
    }
  }

  disconnect() {
    console.log('Disconnecting WebSocket');
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
    }
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.isConnecting = false;
    this.reconnectAttempts = 0;
    this.onDisconnect();
  }
}