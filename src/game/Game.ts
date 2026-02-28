import { Snake } from './Snake';
import { Food } from './Food';
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
  private gameSpeed: number = 150; // ms per tick

  constructor(canvas: HTMLCanvasElement, config: Partial<GameConfig> = {}) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d')!;
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.snake = new Snake(this.config);
    this.input = new InputManager(canvas);
    this.renderer = new Renderer(this.ctx, this.config);
    this.score = new ScoreManager();
    this.sound = new SoundManager();
    
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

    // Fixed timestep game logic
    while (this.accumulator >= this.gameSpeed) {
      this.update();
      this.accumulator -= this.gameSpeed;
    }

    this.render();
    
    if (this.state !== GameState.GAME_OVER) {
      requestAnimationFrame((t) => this.gameLoop(t));
    }
  }

  private update(): void {
    if (this.state !== GameState.PLAYING) return;

    this.snake.move();

    // Check food collision
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

    // Check wall collision
    if (this.config.wallCollision && this.snake.hitsWall()) {
      this.gameOver();
      return;
    }

    // Check self collision
    if (this.snake.hitsSelf()) {
      this.gameOver();
      return;
    }

    // Wrap around if no wall collision
    if (!this.config.wallCollision) {
      this.snake.wrapAround();
    }
  }

  private render(): void {
    this.renderer.clear();
    this.renderer.drawGrid();
    this.foods.forEach(f => this.renderer.drawFood(f));
    this.renderer.drawSnake(this.snake);
    this.renderer.drawUI(this.score.current, this.score.high, this.state);
    
    if (this.state === GameState.GAME_OVER) {
      this.renderer.drawGameOver(this.score.current);
    }
  }

  private spawnFood(): void {
    const food = Food.spawn(this.config, this.snake.body);
    this.foods.push(food);
    
    // Occasionally spawn special food
    if (Math.random() < 0.15 && this.foods.length < 3) {
      this.foods.push(Food.spawnSpecial(this.config, this.snake.body));
    }
  }

  private adjustSpeed(): void {
    // 根据蛇的长度逐渐加速：初始很慢(300ms)，越长越快，最快80ms
    const snakeLength = this.snake.length;
    const extraSegments = Math.max(0, snakeLength - 3); // 初始3节不算
    const speedBoost = extraSegments * 8; // 每长一节快8ms
    this.gameSpeed = Math.max(80, this.config.baseSpeed - speedBoost);
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
    this.spawnFood();
    this.start();
  }

  getState(): GameState { return this.state; }
  getScore(): number { return this.score.current; }
}
