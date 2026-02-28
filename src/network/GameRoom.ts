/**
 * 房间管理 - 创建、加入、匹配游戏房间
 */

import { WebSocketClient, ServerMessage } from './WebSocketClient';

export interface PlayerInfo {
  id: string;
  name: string;
  skinId: string;
  ready: boolean;
}

export interface RoomInfo {
  roomId: string;
  hostId: string;
  players: PlayerInfo[];
  maxPlayers: number;
  status: RoomStatus;
}

export enum RoomStatus {
  WAITING = 'waiting',
  STARTING = 'starting',
  PLAYING = 'playing',
  FINISHED = 'finished',
}

export type RoomEventHandler = (data: RoomEventData) => void;

export interface RoomEventData {
  event: string;
  room?: RoomInfo;
  player?: PlayerInfo;
  message?: string;
}

export class GameRoom {
  private client: WebSocketClient;
  private roomInfo: RoomInfo | null = null;
  private playerId: string = '';
  private eventHandlers: Map<string, RoomEventHandler[]> = new Map();

  constructor(client: WebSocketClient) {
    this.client = client;
    this.setupListeners();
  }

  private setupListeners(): void {
    this.client.on('room_created', (msg: ServerMessage) => {
      this.roomInfo = msg.payload.room as unknown as RoomInfo;
      this.playerId = msg.payload.playerId as string;
      this.emit('room_created', { event: 'room_created', room: this.roomInfo });
    });

    this.client.on('room_joined', (msg: ServerMessage) => {
      this.roomInfo = msg.payload.room as unknown as RoomInfo;
      this.playerId = msg.payload.playerId as string;
      this.emit('room_joined', { event: 'room_joined', room: this.roomInfo });
    });

    this.client.on('player_joined', (msg: ServerMessage) => {
      const player = msg.payload.player as unknown as PlayerInfo;
      if (this.roomInfo) {
        this.roomInfo.players.push(player);
      }
      this.emit('player_joined', { event: 'player_joined', player });
    });

    this.client.on('player_left', (msg: ServerMessage) => {
      const leftId = msg.payload.playerId as string;
      if (this.roomInfo) {
        this.roomInfo.players = this.roomInfo.players.filter(p => p.id !== leftId);
      }
      this.emit('player_left', { event: 'player_left', message: leftId });
    });

    this.client.on('player_ready', (msg: ServerMessage) => {
      const readyId = msg.payload.playerId as string;
      if (this.roomInfo) {
        const player = this.roomInfo.players.find(p => p.id === readyId);
        if (player) player.ready = true;
      }
      this.emit('player_ready', { event: 'player_ready', message: readyId });
    });

    this.client.on('game_starting', (msg: ServerMessage) => {
      if (this.roomInfo) {
        this.roomInfo.status = RoomStatus.STARTING;
      }
      this.emit('game_starting', { event: 'game_starting', room: this.roomInfo ?? undefined });
      // countdown在payload中
      void msg;
    });

    this.client.on('match_found', (msg: ServerMessage) => {
      this.roomInfo = msg.payload.room as unknown as RoomInfo;
      this.playerId = msg.payload.playerId as string;
      this.emit('match_found', { event: 'match_found', room: this.roomInfo });
    });

    this.client.on('room_error', (msg: ServerMessage) => {
      this.emit('error', { event: 'error', message: msg.payload.message as string });
    });
  }

  createRoom(playerName: string, maxPlayers: number = 4): void {
    this.client.send({
      type: 'create_room',
      payload: { playerName, maxPlayers },
    });
  }

  joinRoom(roomId: string, playerName: string): void {
    this.client.send({
      type: 'join_room',
      payload: { roomId, playerName },
    });
  }

  matchmaking(playerName: string): void {
    this.client.send({
      type: 'matchmaking',
      payload: { playerName },
    });
  }

  cancelMatchmaking(): void {
    this.client.send({
      type: 'cancel_matchmaking',
      payload: {},
    });
  }

  setReady(): void {
    this.client.send({
      type: 'player_ready',
      payload: { roomId: this.roomInfo?.roomId },
    });
  }

  leaveRoom(): void {
    if (this.roomInfo) {
      this.client.send({
        type: 'leave_room',
        payload: { roomId: this.roomInfo.roomId },
      });
      this.roomInfo = null;
    }
  }

  on(event: string, handler: RoomEventHandler): void {
    const list = this.eventHandlers.get(event) || [];
    list.push(handler);
    this.eventHandlers.set(event, list);
  }

  off(event: string, handler: RoomEventHandler): void {
    const list = this.eventHandlers.get(event);
    if (list) {
      this.eventHandlers.set(event, list.filter(h => h !== handler));
    }
  }

  private emit(event: string, data: RoomEventData): void {
    const handlers = this.eventHandlers.get(event) || [];
    handlers.forEach(h => h(data));
  }

  getRoomInfo(): RoomInfo | null {
    return this.roomInfo;
  }

  getPlayerId(): string {
    return this.playerId;
  }

  isHost(): boolean {
    return this.roomInfo?.hostId === this.playerId;
  }
}
