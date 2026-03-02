import { Snake } from './Snake';
// Food已被AnimalManager替代
import { AnimalManager } from './AnimalManager';
import { BuffSystem, BuffType } from './BuffSystem';
import { GameConfig, DEFAULT_CONFIG } from '../config/GameConfig';
import { InputManager } from './InputManager';
import { Renderer } from './Renderer';
import { ScoreManager } from './ScoreManager';
import { SoundManager } from '../utils/SoundManager';
import { TerrainManager } from './TerrainManager';

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
  // legacy foods removed — AnimalManager handles all food
  private state: GameState = GameState.MENU;
  private config: GameConfig;
  private input: InputManager;
  private renderer: Renderer;
  private score: ScoreManager;
  private sound: SoundManager;
  private lastTime: number = 0;
  private accumulator: number = 0;
  private gameSpeed: number = 500;

  // Animal food chain system
  private animalManager: AnimalManager;
  private buffSystem: BuffSystem;
  private poisonTimer: number = 0;

  // Terrain system
  private terrain: TerrainManager;

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
    this.terrain = new TerrainManager(this.config);
    
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

    // Update animals and buffs every frame
    this.animalManager.update(deltaTime, this.snake.head, this.snake.body, this.buffSystem);
    this.buffSystem.update(deltaTime);

    // Poison tick: -1 per second while poisoned
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

    // Fixed timestep game logic
    // River slows snake down
    const terrainMultiplier = this.terrain.getSpeedMultiplier(this.snake.head);
    const effectiveSpeed = this.buffSystem.has(BuffType.STUN)
      ? Infinity
      : (this.buffSystem.has(BuffType.SPEED_BOOST)
        ? this.gameSpeed * 0.6
        : this.gameSpeed) / terrainMultiplier;

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

    // Ghost buff: wrap around walls
    if (this.buffSystem.has(BuffType.GHOST)) {
      this.snake.wrapAround();
    }

    // Crocodile damage in river
    if (this.terrain.hasCrocodile(this.snake.head)) {
      this.snake.grow(-2);
      this.renderer.triggerHurt();
      this.sound.play('die');
      if (this.snake.length <= 1) {
        this.gameOver();
        return;
      }
    }

    // 农夫碰撞 — 蛇碰到农夫减3节（农夫用锄头打蛇！）
    if (this.terrain.hasFarmer(this.snake.head)) {
      this.snake.grow(-3);
      this.renderer.triggerHurt();
      this.sound.play('die');
      if (this.snake.length <= 1) {
        this.gameOver();
        return;
      }
    }

    // Check animal collision
    const inBush = this.terrain.isInBush(this.snake.head);
    const result = this.animalManager.checkCollision(this.snake.head, this.buffSystem);
    if (result) {
      // In bush: immune to eagle (predator) damage
      if (inBush && result.animal.def.category === 'predator') {
        result.growAmount = 0;
        result.points = 0;
      }
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

    // Legacy food removed — AnimalManager handles all collisions above

    // Check wall collision
    if (this.config.wallCollision && !this.buffSystem.has(BuffType.GHOST) && this.snake.hitsWall()) {
      this.gameOver();
      return;
    }

    // Check self collision (invincible ignores)
    if (!this.buffSystem.has(BuffType.INVINCIBLE) && this.snake.hitsSelf()) {
      this.gameOver();
      return;
    }

    // Wrap around if no wall collision
    if (!this.config.wallCollision) {
      this.snake.wrapAround();
    }
  }

  private render(): void {
    const renderTime = this.lastTime / 1000;

    this.renderer.clear();
    this.renderer.drawGrid();

    // Terrain base layer (ground texture, river, bush shadows, decorations)
    this.terrain.render(this.ctx, renderTime);

    // Draw animals (with bush opacity)
    const bushes = this.terrain.getBushes();
    for (const animal of this.animalManager.getAnimals()) {
      this.ctx.save();
      // Check if animal is in a bush - reduce opacity
      for (const bush of bushes) {
        if (
          animal.position.x >= bush.gridX && animal.position.x < bush.gridX + bush.width &&
          animal.position.y >= bush.gridY && animal.position.y < bush.gridY + bush.height
        ) {
          this.ctx.globalAlpha = 0.4;
          break;
        }
      }
      this.renderer.drawAnimal(animal);
      this.ctx.restore();
    }

    // Draw snake (with bush/river opacity)
    this.ctx.save();
    if (this.terrain.isInBush(this.snake.head)) {
      this.ctx.globalAlpha = 0.4;
    }
    this.renderer.drawSnake(this.snake);
    this.ctx.restore();

    // Bush overlay (on top of snake/animals for occlusion)
    this.terrain.renderOverlay(this.ctx, renderTime);

    this.renderer.drawUI(this.score.current, this.score.high, this.state);
    
    // Draw active buffs
    this.renderer.drawBuffs(this.buffSystem.getAll());

    if (this.state === GameState.GAME_OVER) {
      this.renderer.drawGameOver(this.score.current);
    }
  }

  // spawnFood removed — AnimalManager handles all spawning

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
    // foods removed
    this.score.reset();
    this.gameSpeed = this.config.baseSpeed;
    this.accumulator = 0;
    this.animalManager.reset();
    this.buffSystem.clear();
    this.poisonTimer = 0;
    this.terrain = new TerrainManager(this.config);
    this.start();
  }

  getState(): GameState { return this.state; }
  getScore(): number { return this.score.current; }
}
