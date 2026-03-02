import { Snake } from './Snake';
import { Food } from './Food';
import { AnimalManager } from './AnimalManager';
import { BuffSystem, BuffType } from './BuffSystem';
import { GameConfig, DEFAULT_CONFIG } from '../config/GameConfig';
import { InputManager } from './InputManager';
import { Renderer } from './Renderer';
import { ScoreManager } from './ScoreManager';
import { SoundManager } from '../utils/SoundManager';

export enum GameState {
  MENU = 'menu',
  PLAYING = 'playing',
  PAUSED = 'paused',
  GAME_OVER = 'game_over',
}

export class Game {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private snake: Snake;
  private foods: Food[] = [];
  private state: GameState = GameState.MENU;
  private config: GameConfig;
  private input: InputManager;
  private renderer: Renderer;
  private score: ScoreManager;
  private sound: SoundManager;
  private lastTime: number = 0;
  private accumulator: number = 0;
  private gameSpeed: number = 500;

  // 动物食物链系统
  private animalManager: AnimalManager;
  private buffSystem: BuffSystem;
  private poisonTimer: number = 0;

  constructor(canvas: HTMLCanvasElement, config: Partial<GameConfig> = {}) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d')!;
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.snake = new Snake(this.config);
    this.input = new InputManager(canvas);
    this.renderer = new Renderer(this.ctx, this.config);
    this.score = new ScoreManager();
    this.sound = new SoundManager();
    this.animalManager = new AnimalManager(this.config);
    this.buffSystem = new BuffSystem();
    
    this.spawnFood();
    this.setupEventListeners();
  }

  private setupEventListeners(): void {
    this.input.onDirection((dir) => {
      if (this.state === GameState.PLAYING) {
        this.snake.setDirection(dir);
      }
    });

    this.input.onAction('pause', () => this.togglePause());
    this.input.onAction('restart', () => this.restart());
  }

  start(): void {
    this.state = GameState.PLAYING;
    this.lastTime = performance.now();
    this.gameLoop(this.lastTime);
  }

  private gameLoop(currentTime: number): void {
    const deltaTime = currentTime - this.lastTime;
    this.lastTime = currentTime;
    this.accumulator += deltaTime;

    // 每帧更新动物AI和buff计时
    this.animalManager.update(deltaTime, this.snake.head, this.snake.body, this.buffSystem);
    this.buffSystem.update(deltaTime);

    // 中毒tick：每秒-1节
    if (this.buffSystem.has(BuffType.POISON)) {
      this.poisonTimer += deltaTime;
      if (this.poisonTimer >= 1000) {
        this.poisonTimer -= 1000;
        this.snake.grow(-1);
        if (this.snake.length <= 1) {
          this.gameOver();
          return;
        }
      }
    } else {
      this.poisonTimer = 0;
    }

    // 眩晕时不移动，加速时更快
    const effectiveSpeed = this.buffSystem.has(BuffType.STUN)
      ? Infinity
      : this.buffSystem.has(BuffType.SPEED_BOOST)
        ? this.gameSpeed * 0.6
        : this.gameSpeed;

    while (this.accumulator >= effectiveSpeed) {
      this.update();
      this.accumulator -= effectiveSpeed;
    }

    this.render();
    
    if (this.state !== GameState.GAME_OVER) {
      requestAnimationFrame((t) => this.gameLoop(t));
    }
  }

  private update(): void {
    if (this.state !== GameState.PLAYING) return;

    this.snake.move();

    // 幽灵buff：穿墙
    if (this.buffSystem.has(BuffType.GHOST)) {
      this.snake.wrapAround();
    }

    // 动物碰撞检测
    const result = this.animalManager.checkCollision(this.snake.head, this.buffSystem);
    if (result) {
      if (result.growAmount !== 0) {
        this.snake.grow(result.growAmount);
      }
      if (result.points > 0) {
        this.score.add(result.points);
      }
      if (result.buffType !== undefined && result.buffDurationMs !== undefined) {
        this.buffSystem.add(result.buffType, result.buffDurationMs);
      }
      this.sound.play('eat');
      this.adjustSpeed();

      if (this.snake.length <= 1) {
        this.gameOver();
        return;
      }
    }

    // 传统食物碰撞（保持向后兼容）
    for (let i = this.foods.length - 1; i >= 0; i--) {
      if (this.snake.headAt(this.foods[i].position)) {
        const food = this.foods[i];
        this.snake.grow(food.growAmount);
        this.score.add(food.points);
        this.sound.play('eat');
        this.foods.splice(i, 1);
        this.spawnFood();
        this.adjustSpeed();
      }
    }

    // 墙壁碰撞（幽灵状态免疫）
    if (this.config.wallCollision && !this.buffSystem.has(BuffType.GHOST) && this.snake.hitsWall()) {
      this.gameOver();
      return;
    }

    // 自身碰撞（无敌状态免疫）
    if (!this.buffSystem.has(BuffType.INVINCIBLE) && this.snake.hitsSelf()) {
      this.gameOver();
      return;
    }

    if (!this.config.wallCollision) {
      this.snake.wrapAround();
    }
  }

  private render(): void {
    this.renderer.clear();
    this.renderer.drawGrid();
    this.foods.forEach(f => this.renderer.drawFood(f));

    // 绘制动物
    for (const animal of this.animalManager.getAnimals()) {
      this.renderer.drawAnimal(animal);
    }

    this.renderer.drawSnake(this.snake);
    this.renderer.drawUI(this.score.current, this.score.high, this.state);
    this.renderer.drawBuffs(this.buffSystem.getAll());
    
    if (this.state === GameState.GAME_OVER) {
      this.renderer.drawGameOver(this.score.current);
    }
  }

  private spawnFood(): void {
    const food = Food.spawn(this.config, this.snake.body);
    this.foods.push(food);
    
    if (Math.random() < 0.15 && this.foods.length < 3) {
      this.foods.push(Food.spawnSpecial(this.config, this.snake.body));
    }
  }

  private adjustSpeed(): void {
    const snakeLength = this.snake.length;
    const extraSegments = Math.max(0, snakeLength - 3);
    const speedBoost = extraSegments * 15;
    this.gameSpeed = Math.max(100, this.config.baseSpeed - speedBoost);
  }

  private togglePause(): void {
    if (this.state === GameState.PLAYING) {
      this.state = GameState.PAUSED;
    } else if (this.state === GameState.PAUSED) {
      this.state = GameState.PLAYING;
    }
  }

  private gameOver(): void {
    this.state = GameState.GAME_OVER;
    this.score.saveHigh();
    this.sound.play('die');
  }

  restart(): void {
    this.snake = new Snake(this.config);
    this.foods = [];
    this.score.reset();
    this.gameSpeed = this.config.baseSpeed;
    this.accumulator = 0;
    this.animalManager.reset();
    this.buffSystem.clear();
    this.poisonTimer = 0;
    this.spawnFood();
    this.start();
  }

  getState(): GameState { return this.state; }
  getScore(): number { return this.score.current; }
}
