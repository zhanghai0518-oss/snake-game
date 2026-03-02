import { Position } from './Snake';
import { GameConfig } from '../config/GameConfig';

export type BossType = 'crocodile_king' | 'lion' | 'dragon';

export interface BossCollisionResult {
  type: 'damage' | 'immune' | 'eat' | 'hit_weak' | 'kill';
  damage?: number;
  points?: number;
  growAmount?: number;
  gameOver?: boolean;
}

export class Boss {
  type: BossType;
  position: Position;
  alive: boolean = true;
  config: GameConfig;

  // Size in grid cells
  size: number;

  // For crocodile king: river swimming
  riverT: number = 0.3; // position along bezier curve
  riverSpeed: number = 0.02;
  riverDirection: number = 1;

  // For lion/dragon: tail-bite mechanics
  hitCount: number = 0;
  maxHits: number = 3;
  minSnakeLengthToBattle: number = 15;
  tailPosition: Position;
  facingDir: number = 1; // 1=right, -1=left
  moveTimer: number = 0;
  moveInterval: number = 10; // seconds between moves

  // Damage values
  damageOnTouch: number = 5;
  killPoints: number = 200;
  killGrow: number = 5;

  // Crocodile king specific
  immuneMinLength: number = 20;
  immuneMaxLength: number = 25;
  eatMinLength: number = 25;

  constructor(type: BossType, config: GameConfig) {
    this.type = type;
    this.config = config;
    this.position = { x: Math.floor(config.gridWidth / 2), y: Math.floor(config.gridHeight / 2) };
    this.tailPosition = { x: this.position.x, y: this.position.y + 1 };

    switch (type) {
      case 'crocodile_king':
        this.size = 2;
        this.damageOnTouch = 5;
        this.killPoints = 200;
        this.killGrow = 3;
        this.immuneMinLength = 20;
        this.immuneMaxLength = 25;
        this.eatMinLength = 25;
        break;
      case 'lion':
        this.size = 2;
        this.maxHits = 3;
        this.minSnakeLengthToBattle = 15;
        this.damageOnTouch = 5;
        this.killPoints = 200;
        this.killGrow = 5;
        this.moveInterval = 10;
        break;
      case 'dragon':
        this.size = 3;
        this.maxHits = 5;
        this.minSnakeLengthToBattle = 20;
        this.damageOnTouch = 5;
        this.killPoints = 300;
        this.killGrow = 7;
        this.moveInterval = 10;
        break;
    }
  }

  update(deltaSeconds: number, bezierPointFn?: (t: number) => { x: number; y: number }, cellSize?: number): void {
    if (!this.alive) return;

    if (this.type === 'crocodile_king' && bezierPointFn && cellSize) {
      // Swim along river
      this.riverT += this.riverSpeed * this.riverDirection * deltaSeconds;
      if (this.riverT > 0.85) { this.riverT = 0.85; this.riverDirection = -1; }
      if (this.riverT < 0.15) { this.riverT = 0.15; this.riverDirection = 1; }
      const pt = bezierPointFn(this.riverT);
      this.position.x = Math.floor(pt.x / cellSize);
      this.position.y = Math.floor(pt.y / cellSize);
    } else if (this.type === 'lion' || this.type === 'dragon') {
      // Move every N seconds
      this.moveTimer += deltaSeconds;
      if (this.moveTimer >= this.moveInterval) {
        this.moveTimer = 0;
        this.moveRandom();
      }
      // Update tail position based on facing direction
      this.updateTailPosition();
    }
  }

  private moveRandom(): void {
    const dirs = [
      { x: 1, y: 0 }, { x: -1, y: 0 },
      { x: 0, y: 1 }, { x: 0, y: -1 },
    ];
    const d = dirs[Math.floor(Math.random() * dirs.length)];
    const nx = this.position.x + d.x * 2;
    const ny = this.position.y + d.y * 2;
    if (nx >= 1 && nx + this.size < this.config.gridWidth - 1 &&
        ny >= 1 && ny + this.size < this.config.gridHeight - 1) {
      this.position.x = nx;
      this.position.y = ny;
      if (d.x !== 0) this.facingDir = d.x;
    }
  }

  private updateTailPosition(): void {
    // Tail is behind the boss body based on facing direction
    this.tailPosition = {
      x: this.facingDir > 0 ? this.position.x - 1 : this.position.x + this.size,
      y: this.position.y + Math.floor(this.size / 2),
    };
  }

  /** Get all grid cells occupied by this boss body (not tail) */
  getBodyCells(): Position[] {
    const cells: Position[] = [];
    for (let dx = 0; dx < this.size; dx++) {
      for (let dy = 0; dy < this.size; dy++) {
        cells.push({ x: this.position.x + dx, y: this.position.y + dy });
      }
    }
    return cells;
  }

  /** Check collision with snake head */
  checkCollision(snakeHead: Position, snakeLength: number): BossCollisionResult | null {
    if (!this.alive) return null;

    if (this.type === 'crocodile_king') {
      return this.checkCrocodileKingCollision(snakeHead, snakeLength);
    } else {
      return this.checkTailBiteCollision(snakeHead, snakeLength);
    }
  }

  private checkCrocodileKingCollision(head: Position, snakeLength: number): BossCollisionResult | null {
    // Check if head is on any boss cell
    const onBoss = this.getBodyCells().some(c => c.x === head.x && c.y === head.y);
    if (!onBoss) return null;

    if (snakeLength > this.eatMinLength) {
      this.alive = false;
      return { type: 'kill', points: this.killPoints, growAmount: this.killGrow };
    } else if (snakeLength > this.immuneMinLength) {
      return { type: 'immune' };
    } else {
      return { type: 'damage', damage: this.damageOnTouch };
    }
  }

  private checkTailBiteCollision(head: Position, snakeLength: number): BossCollisionResult | null {
    // Check tail hit first
    if (head.x === this.tailPosition.x && head.y === this.tailPosition.y) {
      if (snakeLength < this.minSnakeLengthToBattle) {
        return { type: 'damage', damage: this.damageOnTouch };
      }
      this.hitCount++;
      if (this.hitCount >= this.maxHits) {
        this.alive = false;
        return { type: 'kill', points: this.killPoints, growAmount: this.killGrow };
      }
      return { type: 'hit_weak' };
    }

    // Check body hit
    const onBody = this.getBodyCells().some(c => c.x === head.x && c.y === head.y);
    if (!onBody) return null;

    if (snakeLength < this.minSnakeLengthToBattle) {
      return { type: 'damage', damage: this.damageOnTouch };
    }
    // Even if long enough, hitting body still hurts
    return { type: 'damage', damage: this.damageOnTouch };
  }
}
