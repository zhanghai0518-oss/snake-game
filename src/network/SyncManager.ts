/**
 * 游戏状态同步管理器 - 同步蛇位置、食物、分数等游戏状态
 */

import { WebSocketClient, ServerMessage } from './WebSocketClient';
import { Position, Direction } from '../game/Snake';

export interface SnakeState {
  playerId: string;
  body: Position[];
  direction: Direction;
  alive: boolean;
  score: number;
  skinId: string;
}

export interface FoodState {
  id: string;
  position: Position;
  type: string;
}

export interface GameSyncState {
  tick: number;
  snakes: SnakeState[];
  foods: FoodState[];
  timestamp: number;
}

export type SyncEventHandler = (state: GameSyncState) => void;
export type PlayerEventHandler = (data: { playerId: string; reason?: string }) => void;

export class SyncManager {
  private client: WebSocketClient;
  private localPlayerId: string = '';
  private currentState: GameSyncState | null = null;
  private inputSequence: number = 0;
  private pendingInputs: Array<{ seq: number; direction: Direction; timestamp: number }> = [];

  private onStateUpdate: SyncEventHandler | null = null;
  private onPlayerDied: PlayerEventHandler | null = null;
  private onGameOver: (() => void) | null = null;

  // 插值缓冲区
  private stateBuffer: GameSyncState[] = [];
  private readonly bufferSize: number = 3;

  constructor(client: WebSocketClient) {
    this.client = client;
    this.setupListeners();
  }

  private setupListeners(): void {
    this.client.on('game_state', (msg: ServerMessage) => {
      const state = msg.payload as unknown as GameSyncState;
      this.currentState = state;
      this.stateBuffer.push(state);
      if (this.stateBuffer.length > this.bufferSize) {
        this.stateBuffer.shift();
      }
      // 服务端和解：移除已确认的输入
      const serverTick = state.tick;
      this.pendingInputs = this.pendingInputs.filter(input => input.seq > serverTick);
      this.onStateUpdate?.(state);
    });

    this.client.on('player_died', (msg: ServerMessage) => {
      const playerId = msg.payload.playerId as string;
      const reason = msg.payload.reason as string | undefined;
      this.onPlayerDied?.({ playerId, reason });
    });

    this.client.on('game_over', () => {
      this.onGameOver?.();
    });
  }

  setPlayerId(id: string): void {
    this.localPlayerId = id;
  }

  sendInput(direction: Direction): void {
    this.inputSequence++;
    const input = {
      seq: this.inputSequence,
      direction,
      timestamp: Date.now(),
    };
    this.pendingInputs.push(input);

    this.client.send({
      type: 'player_input',
      payload: {
        playerId: this.localPlayerId,
        direction,
        sequence: this.inputSequence,
        timestamp: input.timestamp,
      },
    });
  }

  sendEatFood(foodId: string): void {
    this.client.send({
      type: 'eat_food',
      payload: {
        playerId: this.localPlayerId,
        foodId,
      },
    });
  }

  getInterpolatedState(renderTime: number): GameSyncState | null {
    if (this.stateBuffer.length < 2) {
      return this.currentState;
    }

    // 找到两个用于插值的状态
    const older = this.stateBuffer[this.stateBuffer.length - 2];
    const newer = this.stateBuffer[this.stateBuffer.length - 1];

    if (!older || !newer) return this.currentState;

    const duration = newer.timestamp - older.timestamp;
    if (duration <= 0) return newer;

    const elapsed = renderTime - older.timestamp;
    const t = Math.min(1, Math.max(0, elapsed / duration));

    // 对远程蛇进行位置插值
    const interpolatedSnakes = newer.snakes.map((newSnake) => {
      if (newSnake.playerId === this.localPlayerId) {
        return newSnake; // 本地蛇用客户端预测
      }
      const oldSnake = older.snakes.find(s => s.playerId === newSnake.playerId);
      if (!oldSnake) return newSnake;

      const body = newSnake.body.map((pos, i) => {
        const oldPos = oldSnake.body[i];
        if (!oldPos) return pos;
        return {
          x: oldPos.x + (pos.x - oldPos.x) * t,
          y: oldPos.y + (pos.y - oldPos.y) * t,
        };
      });

      return { ...newSnake, body };
    });

    return {
      ...newer,
      snakes: interpolatedSnakes,
    };
  }

  onSync(handler: SyncEventHandler): void {
    this.onStateUpdate = handler;
  }

  onDeath(handler: PlayerEventHandler): void {
    this.onPlayerDied = handler;
  }

  onEnd(handler: () => void): void {
    this.onGameOver = handler;
  }

  getCurrentState(): GameSyncState | null {
    return this.currentState;
  }

  getLocalPlayerId(): string {
    return this.localPlayerId;
  }

  reset(): void {
    this.currentState = null;
    this.stateBuffer = [];
    this.pendingInputs = [];
    this.inputSequence = 0;
  }
}
