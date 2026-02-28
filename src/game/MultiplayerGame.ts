/**
 * 多人游戏模式 - 支持多条蛇同屏对战
 */

import { Snake, Direction, Position } from './Snake';
import { Food, FoodType } from './Food';
import { GameConfig, DEFAULT_CONFIG } from '../config/GameConfig';
import { Renderer } from './Renderer';
import { InputManager } from './InputManager';
import { SoundManager } from '../utils/SoundManager';
import { WebSocketClient, ConnectionState } from '../network/WebSocketClient';
import { GameRoom } from '../network/GameRoom';
import { SyncManager, GameSyncState, SnakeState } from '../network/SyncManager';

export enum MultiplayerState {
  DISCONNECTED = 'disconnected',
  LOBBY = 'lobby',
  PLAYING = 'playing',
  SPECTATING = 'spectating',
  GAME_OVER = 'game_over',
}

interface RemoteSnake {
  snake: Snake;
  playerId: string;
  name: string;
  score: number;
  alive: boolean;
  color: string;
}

const PLAYER_COLORS = ['#00ff88', '#ff4488', '#44aaff', '#ffaa00', '#aa44ff', '#ff6644'];

export class MultiplayerGame {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private config: GameConfig;
  private renderer: Renderer;
  private input: InputManager;
  private sound: SoundManager;

  private wsClient: WebSocketClient;
  private room: GameRoom;
  private sync: SyncManager;

  private localSnake: Snake;
  private remoteSnakes: Map<string, RemoteSnake> = new Map();
  private foods: Food[] = [];
  private state: MultiplayerState = MultiplayerState.DISCONNECTED;
  private localScore: number = 0;
  private localAlive: boolean = true;

  private lastTime: number = 0;
  private accumulator: number = 0;
  private animationFrameId: number = 0;

  constructor(canvas: HTMLCanvasElement, serverUrl: string, config: Partial<GameConfig> = {}) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d')!;
    this.config = { ...DEFAULT_CONFIG, ...config, gameMode: 'battle' };
    this.renderer = new Renderer(this.ctx, this.config);
    this.input = new InputManager(canvas);
    this.sound = new SoundManager();
    this.localSnake = new Snake(this.config);

    // 网络初始化
    this.wsClient = new WebSocketClient(serverUrl);
    this.room = new GameRoom(this.wsClient);
    this.sync = new SyncManager(this.wsClient);

    this.setupInput();
    this.setupNetworkEvents();
  }

  private setupInput(): void {
    this.input.onDirection((dir: Direction) => {
      if (this.state === MultiplayerState.PLAYING && this.localAlive) {
        this.localSnake.setDirection(dir);
        this.sync.sendInput(dir);
      }
    });
  }

  private setupNetworkEvents(): void {
    this.room.on('game_starting', () => {
      this.state = MultiplayerState.PLAYING;
      this.startGameLoop();
    });

    this.sync.onSync((syncState: GameSyncState) => {
      this.applyServerState(syncState);
    });

    this.sync.onDeath((data) => {
      if (data.playerId === this.sync.getLocalPlayerId()) {
        this.localAlive = false;
        this.state = MultiplayerState.SPECTATING;
        this.sound.play('die');
      }
      const remote = this.remoteSnakes.get(data.playerId);
      if (remote) {
        remote.alive = false;
      }
    });

    this.sync.onEnd(() => {
      this.state = MultiplayerState.GAME_OVER;
    });
  }

  async connect(): Promise<void> {
    await this.wsClient.connect();
    this.state = MultiplayerState.LOBBY;
  }

  createRoom(playerName: string, maxPlayers?: number): void {
    this.room.createRoom(playerName, maxPlayers);
  }

  joinRoom(roomId: string, playerName: string): void {
    this.room.joinRoom(roomId, playerName);
  }

  matchmaking(playerName: string): void {
    this.room.matchmaking(playerName);
  }

  setReady(): void {
    this.room.setReady();
  }

  private applyServerState(syncState: GameSyncState): void {
    // 更新远程蛇
    for (const snakeState of syncState.snakes) {
      if (snakeState.playerId === this.sync.getLocalPlayerId()) {
        // 更新本地分数
        this.localScore = snakeState.score;
        this.localAlive = snakeState.alive;
        // 服务端和解：校正本地蛇位置
        this.reconcileLocalSnake(snakeState);
        continue;
      }

      let remote = this.remoteSnakes.get(snakeState.playerId);
      if (!remote) {
        const snake = new Snake(this.config);
        const colorIndex = this.remoteSnakes.size % PLAYER_COLORS.length;
        remote = {
          snake,
          playerId: snakeState.playerId,
          name: snakeState.playerId,
          score: 0,
          alive: true,
          color: PLAYER_COLORS[colorIndex] ?? '#ffffff',
        };
        this.remoteSnakes.set(snakeState.playerId, remote);
      }

      remote.snake.body = [...snakeState.body];
      remote.score = snakeState.score;
      remote.alive = snakeState.alive;
    }

    // 移除已断开的玩家
    const activeIds = new Set(syncState.snakes.map(s => s.playerId));
    for (const [id] of this.remoteSnakes) {
      if (!activeIds.has(id)) {
        this.remoteSnakes.delete(id);
      }
    }

    // 更新食物
    this.foods = syncState.foods.map(f => {
      const foodType = (f.type as FoodType) || FoodType.NORMAL;
      return new Food(f.position, foodType);
    });
  }

  private reconcileLocalSnake(serverState: SnakeState): void {
    // 简单和解：如果偏差过大则直接校正
    const serverHead = serverState.body[0];
    const localHead = this.localSnake.head;
    if (serverHead) {
      const dx = Math.abs(serverHead.x - localHead.x);
      const dy = Math.abs(serverHead.y - localHead.y);
      if (dx > 2 || dy > 2) {
        this.localSnake.body = [...serverState.body];
      }
    }
  }

  private startGameLoop(): void {
    this.lastTime = performance.now();
    this.accumulator = 0;
    this.gameLoop(this.lastTime);
  }

  private gameLoop(currentTime: number): void {
    const deltaTime = currentTime - this.lastTime;
    this.lastTime = currentTime;
    this.accumulator += deltaTime;

    while (this.accumulator >= this.config.baseSpeed) {
      this.update();
      this.accumulator -= this.config.baseSpeed;
    }

    this.render();

    if (this.state === MultiplayerState.PLAYING || this.state === MultiplayerState.SPECTATING) {
      this.animationFrameId = requestAnimationFrame((t) => this.gameLoop(t));
    }
  }

  private update(): void {
    if (this.state !== MultiplayerState.PLAYING) return;
    if (!this.localAlive) return;

    // 客户端预测：本地蛇先移动
    this.localSnake.move();

    // 碰墙检测
    if (this.config.wallCollision && this.localSnake.hitsWall()) {
      this.localAlive = false;
      this.state = MultiplayerState.SPECTATING;
      return;
    }
    if (!this.config.wallCollision) {
      this.localSnake.wrapAround();
    }

    // 食物碰撞（本地预测，服务端确认）
    for (const food of this.foods) {
      if (this.localSnake.headAt(food.position)) {
        this.localSnake.grow(food.growAmount);
        this.sound.play('eat');
        // 通知服务器
        const foodIndex = this.foods.indexOf(food);
        this.sync.sendEatFood(String(foodIndex));
        break;
      }
    }
  }

  private render(): void {
    this.renderer.clear();
    this.renderer.drawGrid();

    // 绘制食物
    this.foods.forEach(f => this.renderer.drawFood(f));

    // 绘制远程蛇
    for (const [, remote] of this.remoteSnakes) {
      if (remote.alive) {
        this.renderer.drawSnake(remote.snake);
      }
    }

    // 绘制本地蛇
    if (this.localAlive) {
      this.renderer.drawSnake(this.localSnake);
    }

    // 绘制多人游戏UI
    this.drawMultiplayerUI();

    if (this.state === MultiplayerState.GAME_OVER) {
      this.drawGameOverScreen();
    }
  }

  private drawMultiplayerUI(): void {
    const ctx = this.ctx;

    // 本地分数
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 16px Arial';
    ctx.textAlign = 'left';
    ctx.fillText(`分数: ${this.localScore}`, 10, 25);

    // 玩家列表
    ctx.font = '12px Arial';
    ctx.textAlign = 'right';
    let y = 20;

    // 本地玩家
    ctx.fillStyle = this.localAlive ? '#00ff88' : '#666666';
    ctx.fillText(`你: ${this.localScore}`, this.canvas.width - 10, y);
    y += 18;

    // 远程玩家
    for (const [, remote] of this.remoteSnakes) {
      ctx.fillStyle = remote.alive ? remote.color : '#666666';
      ctx.fillText(`${remote.name}: ${remote.score}`, this.canvas.width - 10, y);
      y += 18;
    }

    // 连接状态
    if (this.wsClient.getState() !== ConnectionState.CONNECTED) {
      ctx.fillStyle = 'rgba(0,0,0,0.5)';
      ctx.fillRect(0, this.canvas.height / 2 - 20, this.canvas.width, 40);
      ctx.fillStyle = '#ffaa00';
      ctx.font = 'bold 18px Arial';
      ctx.textAlign = 'center';
      ctx.fillText('⚠ 重新连接中...', this.canvas.width / 2, this.canvas.height / 2 + 6);
    }

    // 观战模式提示
    if (this.state === MultiplayerState.SPECTATING) {
      ctx.fillStyle = 'rgba(0,0,0,0.3)';
      ctx.fillRect(0, this.canvas.height - 30, this.canvas.width, 30);
      ctx.fillStyle = '#aaaaaa';
      ctx.font = '14px Arial';
      ctx.textAlign = 'center';
      ctx.fillText('👁 观战中', this.canvas.width / 2, this.canvas.height - 10);
    }
  }

  private drawGameOverScreen(): void {
    const ctx = this.ctx;
    ctx.fillStyle = 'rgba(0,0,0,0.7)';
    ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    ctx.fillStyle = '#ff4444';
    ctx.font = 'bold 32px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('🏆 对战结束', this.canvas.width / 2, this.canvas.height / 2 - 40);

    // 排行榜
    const allPlayers: Array<{ name: string; score: number }> = [
      { name: '你', score: this.localScore },
    ];
    for (const [, r] of this.remoteSnakes) {
      allPlayers.push({ name: r.name, score: r.score });
    }
    allPlayers.sort((a, b) => b.score - a.score);

    ctx.font = '18px Arial';
    allPlayers.forEach((p, i) => {
      const medal = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : '  ';
      ctx.fillStyle = i === 0 ? '#ffdd44' : '#ffffff';
      ctx.fillText(`${medal} ${p.name}: ${p.score}`, this.canvas.width / 2, this.canvas.height / 2 + i * 25);
    });
  }

  disconnect(): void {
    cancelAnimationFrame(this.animationFrameId);
    this.room.leaveRoom();
    this.wsClient.disconnect();
    this.state = MultiplayerState.DISCONNECTED;
    this.remoteSnakes.clear();
    this.sync.reset();
  }

  getState(): MultiplayerState {
    return this.state;
  }

  getRoom(): GameRoom {
    return this.room;
  }

  getScore(): number {
    return this.localScore;
  }
}
