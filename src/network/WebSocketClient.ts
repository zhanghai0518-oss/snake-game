/**
 * WebSocket客户端 - 负责与游戏服务器的WebSocket通信
 */

export type MessageHandler = (data: ServerMessage) => void;

export interface ServerMessage {
  type: string;
  payload: Record<string, unknown>;
}

export interface ClientMessage {
  type: string;
  payload: Record<string, unknown>;
}

export enum ConnectionState {
  DISCONNECTED = 'disconnected',
  CONNECTING = 'connecting',
  CONNECTED = 'connected',
  RECONNECTING = 'reconnecting',
}

export class WebSocketClient {
  private ws: WebSocket | null = null;
  private url: string;
  private state: ConnectionState = ConnectionState.DISCONNECTED;
  private handlers: Map<string, MessageHandler[]> = new Map();
  private reconnectAttempts: number = 0;
  private maxReconnectAttempts: number = 5;
  private reconnectDelay: number = 1000;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private pingInterval: ReturnType<typeof setInterval> | null = null;

  constructor(url: string) {
    this.url = url;
  }

  connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (this.state === ConnectionState.CONNECTED) {
        resolve();
        return;
      }

      this.state = ConnectionState.CONNECTING;
      this.ws = new WebSocket(this.url);

      this.ws.onopen = () => {
        this.state = ConnectionState.CONNECTED;
        this.reconnectAttempts = 0;
        this.startPing();
        resolve();
      };

      this.ws.onmessage = (event: MessageEvent) => {
        try {
          const message: ServerMessage = JSON.parse(event.data as string);
          this.dispatch(message);
        } catch {
          console.error('无法解析服务器消息');
        }
      };

      this.ws.onclose = () => {
        this.state = ConnectionState.DISCONNECTED;
        this.stopPing();
        this.attemptReconnect();
      };

      this.ws.onerror = () => {
        if (this.state === ConnectionState.CONNECTING) {
          reject(new Error('WebSocket连接失败'));
        }
      };
    });
  }

  disconnect(): void {
    this.stopPing();
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    this.reconnectAttempts = this.maxReconnectAttempts; // 阻止自动重连
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.state = ConnectionState.DISCONNECTED;
  }

  send(message: ClientMessage): void {
    if (this.ws && this.state === ConnectionState.CONNECTED) {
      this.ws.send(JSON.stringify(message));
    }
  }

  on(type: string, handler: MessageHandler): void {
    const list = this.handlers.get(type) || [];
    list.push(handler);
    this.handlers.set(type, list);
  }

  off(type: string, handler: MessageHandler): void {
    const list = this.handlers.get(type);
    if (list) {
      this.handlers.set(type, list.filter(h => h !== handler));
    }
  }

  getState(): ConnectionState {
    return this.state;
  }

  private dispatch(message: ServerMessage): void {
    const handlers = this.handlers.get(message.type) || [];
    handlers.forEach(h => h(message));

    // 通配符处理
    const wildcardHandlers = this.handlers.get('*') || [];
    wildcardHandlers.forEach(h => h(message));
  }

  private attemptReconnect(): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      this.dispatch({ type: 'connection_failed', payload: {} });
      return;
    }

    this.state = ConnectionState.RECONNECTING;
    this.reconnectAttempts++;
    const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1);

    this.reconnectTimer = setTimeout(() => {
      this.connect().catch(() => {
        // 重连失败，将由onclose继续尝试
      });
    }, delay);
  }

  private startPing(): void {
    this.pingInterval = setInterval(() => {
      this.send({ type: 'ping', payload: { timestamp: Date.now() } });
    }, 30000);
  }

  private stopPing(): void {
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
      this.pingInterval = null;
    }
  }
}
