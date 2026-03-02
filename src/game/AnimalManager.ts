import { Position } from './Snake';
import { GameConfig } from '../config/GameConfig';
import { BuffSystem, BuffType } from './BuffSystem';

export type AnimalCategory = 'prey' | 'predator' | 'powerup';

export enum AnimalType {
  MOUSE = 'mouse',
  FROG = 'frog',
  RABBIT = 'rabbit',
  SNAKE_EGG = 'snake_egg',
  BIRD_EGG = 'bird_egg',
  EAGLE = 'eagle',
  HEDGEHOG = 'hedgehog',
  POISON_FROG = 'poison_frog',
  DIAMOND = 'diamond',
  MAGNET = 'magnet',
  ICE = 'ice',
  FIRE = 'fire',
  GHOST = 'ghost',
}

export interface AnimalDef {
  type: AnimalType;
  category: AnimalCategory;
  emoji: string;
  probability: number;
  growAmount: number;
  points: number;
}

const ANIMAL_DEFS: AnimalDef[] = [
  { type: AnimalType.MOUSE,       category: 'prey',     emoji: '🐁', probability: 0.50, growAmount: 1, points: 10 },
  { type: AnimalType.FROG,        category: 'prey',     emoji: '🐸', probability: 0.15, growAmount: 2, points: 20 },
  { type: AnimalType.RABBIT,      category: 'prey',     emoji: '🐰', probability: 0.08, growAmount: 3, points: 30 },
  { type: AnimalType.SNAKE_EGG,   category: 'prey',     emoji: '🥚', probability: 0.10, growAmount: 1, points: 15 },
  { type: AnimalType.BIRD_EGG,    category: 'prey',     emoji: '🪺', probability: 0.12, growAmount: 1, points: 15 },
  { type: AnimalType.EAGLE,       category: 'predator', emoji: '🦅', probability: 0.05, growAmount: -3, points: 0 },
  { type: AnimalType.HEDGEHOG,    category: 'predator', emoji: '🦔', probability: 0.08, growAmount: -2, points: 0 },
  { type: AnimalType.POISON_FROG, category: 'predator', emoji: '🐸', probability: 0.05, growAmount: 0, points: 0 },
  { type: AnimalType.DIAMOND,     category: 'powerup',  emoji: '💎', probability: 0.03, growAmount: 0, points: 0 },
  { type: AnimalType.MAGNET,      category: 'powerup',  emoji: '🧲', probability: 0.04, growAmount: 0, points: 0 },
  { type: AnimalType.ICE,         category: 'powerup',  emoji: '❄️', probability: 0.04, growAmount: 0, points: 0 },
  { type: AnimalType.FIRE,        category: 'powerup',  emoji: '🔥', probability: 0.03, growAmount: 0, points: 0 },
  { type: AnimalType.GHOST,       category: 'powerup',  emoji: '👻', probability: 0.03, growAmount: 0, points: 0 },
];

export class Animal {
  position: Position;
  def: AnimalDef;
  private config: GameConfig;
  private aiTimer: number = 0;
  private alive: boolean = true;
  frozen: boolean = false;

  // Eagle direction
  private eagleDirection: Position = { x: 1, y: 0 };

  // Poison frog flash
  flashOn: boolean = true;
  private flashTimer: number = 0;

  constructor(pos: Position, def: AnimalDef, config: GameConfig) {
    this.position = { ...pos };
    this.def = def;
    this.config = config;

    if (def.type === AnimalType.EAGLE) {
      const dirs = [{ x: 1, y: 0 }, { x: -1, y: 0 }, { x: 0, y: 1 }, { x: 0, y: -1 }];
      this.eagleDirection = dirs[Math.floor(Math.random() * dirs.length)];
    }
  }

  get isAlive(): boolean { return this.alive; }
  kill(): void { this.alive = false; }

  update(deltaMs: number, snakeHead: Position): void {
    if (!this.alive || this.frozen) return;
    this.aiTimer += deltaMs;

    switch (this.def.type) {
      case AnimalType.MOUSE:
      case AnimalType.SNAKE_EGG:
      case AnimalType.DIAMOND:
      case AnimalType.MAGNET:
      case AnimalType.ICE:
      case AnimalType.FIRE:
      case AnimalType.GHOST:
        break;

      case AnimalType.FROG:
        // Frog stays still for 15 seconds, then jumps to a random position
        if (this.aiTimer >= 15000) {
          this.aiTimer = 0;
          // Jump to a completely random position
          this.position.x = Math.floor(Math.random() * this.config.gridWidth);
          this.position.y = Math.floor(Math.random() * this.config.gridHeight);
        }
        break;

      case AnimalType.RABBIT: {
        const dx = snakeHead.x - this.position.x;
        const dy = snakeHead.y - this.position.y;
        const dist = Math.abs(dx) + Math.abs(dy);
        if (dist <= 3 && this.aiTimer >= 400) {
          this.aiTimer = 0;
          const fleeX = dx !== 0 ? (dx > 0 ? -1 : 1) : 0;
          const fleeY = dy !== 0 ? (dy > 0 ? -1 : 1) : 0;
          if (Math.abs(dx) >= Math.abs(dy)) {
            this.tryMove(fleeX, 0);
          } else {
            this.tryMove(0, fleeY);
          }
        }
        break;
      }

      case AnimalType.BIRD_EGG:
        // 鸟蛋静止不动
        break;

      case AnimalType.EAGLE:
        if (this.aiTimer >= 150) {
          this.aiTimer = 0;
          this.position.x += this.eagleDirection.x;
          this.position.y += this.eagleDirection.y;
          if (this.position.x < -1 || this.position.x > this.config.gridWidth ||
              this.position.y < -1 || this.position.y > this.config.gridHeight) {
            this.alive = false;
          }
        }
        break;

      case AnimalType.HEDGEHOG:
        if (this.aiTimer >= 1000) {
          this.aiTimer = 0;
          this.moveRandom();
        }
        break;

      case AnimalType.POISON_FROG:
        this.flashTimer += deltaMs;
        if (this.flashTimer >= 500) {
          this.flashTimer = 0;
          this.flashOn = !this.flashOn;
        }
        break;
    }
  }

  private moveRandom(): void {
    const dirs = [{ x: 0, y: -1 }, { x: 0, y: 1 }, { x: -1, y: 0 }, { x: 1, y: 0 }];
    const d = dirs[Math.floor(Math.random() * dirs.length)];
    this.tryMove(d.x, d.y);
  }

  private tryMove(dx: number, dy: number): void {
    const nx = this.position.x + dx;
    const ny = this.position.y + dy;
    if (nx >= 0 && nx < this.config.gridWidth && ny >= 0 && ny < this.config.gridHeight) {
      this.position.x = nx;
      this.position.y = ny;
    }
  }
}

export interface CollisionResult {
  animal: Animal;
  growAmount: number;
  points: number;
  buffType?: BuffType;
  buffDurationMs?: number;
}

// 动物解锁阶段：score阈值 → 解锁的动物类型
const ANIMAL_UNLOCK_STAGES: { minScore: number; types: AnimalType[] }[] = [
  { minScore: 0,   types: [AnimalType.MOUSE] },                                    // 开局只有老鼠
  { minScore: 15,  types: [AnimalType.BIRD_EGG] },                                 // 15分解锁鸟蛋
  { minScore: 30,  types: [AnimalType.FROG] },               // 30分解锁青蛙和蛇蛋
  { minScore: 50,  types: [AnimalType.RABBIT, AnimalType.HEDGEHOG] },              // 50分解锁兔子和刺猬
  { minScore: 80,  types: [AnimalType.EAGLE, AnimalType.DIAMOND, AnimalType.ICE] },// 80分解锁老鹰和道具
  { minScore: 120, types: [AnimalType.POISON_FROG, AnimalType.MAGNET, AnimalType.FIRE, AnimalType.GHOST] }, // 120分全部解锁
];

export class AnimalManager {
  private animals: Animal[] = [];
  private config: GameConfig;
  private maxAnimals: number = 2;  // 开局最多2个猎物，简单不凌乱
  private snakeEggStreak: number = 0;
  private currentScore: number = 0;

  // Level-based filtering (set by Game via setLevelFilter)
  private levelAvailableAnimals: string[] | null = null;
  private levelAvailableEnemies: string[] | null = null;
  private levelMaxAnimals: number | null = null;
  private levelScoreMultiplier: number = 1;

  constructor(config: GameConfig) {
    this.config = config;
  }

  /** Called by Game when level changes to restrict animal types */
  setLevelFilter(availableAnimals: string[], availableEnemies: string[], maxAnimals: number, scoreMultiplier: number): void {
    this.levelAvailableAnimals = availableAnimals;
    this.levelAvailableEnemies = availableEnemies;
    this.levelMaxAnimals = maxAnimals;
    this.levelScoreMultiplier = scoreMultiplier;
  }

  getAnimals(): Animal[] {
    return this.animals;
  }

  update(deltaMs: number, snakeHead: Position, snakeBody: Position[], buffSystem: BuffSystem, score: number = 0): void {
    this.currentScore = score;
    // Use level-based max if set, otherwise fallback to progressive
    if (this.levelMaxAnimals !== null) {
      this.maxAnimals = this.levelMaxAnimals;
    } else {
      this.maxAnimals = Math.min(6, 2 + Math.floor(score / 30));
    }
    const frozen = buffSystem.has(BuffType.FREEZE_ENEMIES);

    for (const animal of this.animals) {
      animal.frozen = frozen && animal.def.category === 'predator';
      animal.update(deltaMs, snakeHead);
    }

    // Magnet: pull prey toward snake
    if (buffSystem.has(BuffType.MAGNET)) {
      for (const a of this.animals) {
        if (a.def.category === 'prey' && a.isAlive) {
          const dx = snakeHead.x - a.position.x;
          const dy = snakeHead.y - a.position.y;
          if (dx !== 0) a.position.x += dx > 0 ? 1 : -1;
          if (dy !== 0) a.position.y += dy > 0 ? 1 : -1;
        }
      }
    }

    // Remove dead
    this.animals = this.animals.filter(a => a.isAlive);

    // Replenish
    while (this.animals.length < this.maxAnimals) {
      this.spawnAnimal(snakeBody);
    }
  }

  checkCollision(snakeHead: Position, buffSystem: BuffSystem): CollisionResult | null {
    for (const animal of this.animals) {
      if (!animal.isAlive) continue;
      if (animal.position.x === snakeHead.x && animal.position.y === snakeHead.y) {
        animal.kill();
        return this.resolveCollision(animal, buffSystem);
      }
    }
    return null;
  }

  private resolveCollision(animal: Animal, buffSystem: BuffSystem): CollisionResult {
    const result: CollisionResult = {
      animal,
      growAmount: animal.def.growAmount,
      points: animal.def.points,
    };

    // Fire buff: any animal gives +2
    if (buffSystem.has(BuffType.FIRE) && animal.def.category !== 'powerup') {
      result.growAmount = 2;
      result.points = Math.max(result.points, 10);
    }

    // Invincible: ignore predator damage
    if (buffSystem.has(BuffType.INVINCIBLE) && animal.def.category === 'predator') {
      result.growAmount = 0;
      result.points = 5;
      return result;
    }

    switch (animal.def.type) {
      case AnimalType.SNAKE_EGG:
        this.snakeEggStreak++;
        if (this.snakeEggStreak >= 3) {
          result.growAmount += 5;
          this.snakeEggStreak = 0;
        }
        break;
      case AnimalType.BIRD_EGG:
        // 鸟蛋：普通食物，无特殊效果
        break;
      case AnimalType.HEDGEHOG:
        result.buffType = BuffType.STUN;
        result.buffDurationMs = 1500;
        break;
      case AnimalType.POISON_FROG:
        result.buffType = BuffType.POISON;
        result.buffDurationMs = 3000;
        break;
      case AnimalType.DIAMOND:
        result.buffType = BuffType.INVINCIBLE;
        result.buffDurationMs = 3000;
        break;
      case AnimalType.MAGNET:
        result.buffType = BuffType.MAGNET;
        result.buffDurationMs = 5000;
        break;
      case AnimalType.ICE:
        result.buffType = BuffType.FREEZE_ENEMIES;
        result.buffDurationMs = 3000;
        break;
      case AnimalType.FIRE:
        result.buffType = BuffType.FIRE;
        result.buffDurationMs = 5000;
        break;
      case AnimalType.GHOST:
        result.buffType = BuffType.GHOST;
        result.buffDurationMs = 5000;
        break;
    }

    if (animal.def.type !== AnimalType.SNAKE_EGG) {
      this.snakeEggStreak = 0;
    }

    // Apply level score multiplier
    if (this.levelScoreMultiplier !== 1 && result.points > 0) {
      result.points = Math.round(result.points * this.levelScoreMultiplier);
    }

    return result;
  }

  private spawnAnimal(snakeBody: Position[]): void {
    const def = this.pickAnimalDef();
    const pos = this.findFreePosition(snakeBody);
    if (pos) {
      this.animals.push(new Animal(pos, def, this.config));
    }
  }

  private pickAnimalDef(): AnimalDef {
    // If level filter is set, use it; otherwise fall back to score-based unlock
    let available: AnimalDef[];
    if (this.levelAvailableAnimals !== null && this.levelAvailableEnemies !== null) {
      const allowed = new Set<string>([...this.levelAvailableAnimals, ...this.levelAvailableEnemies]);
      // Always include powerups
      for (const d of ANIMAL_DEFS) {
        if (d.category === 'powerup') allowed.add(d.type);
      }
      available = ANIMAL_DEFS.filter(d => allowed.has(d.type));
    } else {
      const unlockedTypes = new Set<AnimalType>();
      for (const stage of ANIMAL_UNLOCK_STAGES) {
        if (this.currentScore >= stage.minScore) {
          stage.types.forEach(t => unlockedTypes.add(t));
        }
      }
      available = ANIMAL_DEFS.filter(d => unlockedTypes.has(d.type));
    }
    if (available.length === 0) return ANIMAL_DEFS[0];

    // 按概率加权随机
    const totalProb = available.reduce((s, d) => s + d.probability, 0);
    const r = Math.random() * totalProb;
    let cumulative = 0;
    for (const def of available) {
      cumulative += def.probability;
      if (r < cumulative) return def;
    }
    return available[0];
  }

  private findFreePosition(snakeBody: Position[]): Position | null {
    for (let attempt = 0; attempt < 100; attempt++) {
      const pos: Position = {
        x: Math.floor(Math.random() * this.config.gridWidth),
        y: Math.floor(Math.random() * this.config.gridHeight),
      };
      const occupied = snakeBody.some(s => s.x === pos.x && s.y === pos.y) ||
                       this.animals.some(a => a.position.x === pos.x && a.position.y === pos.y);
      if (!occupied) return pos;
    }
    return null;
  }

  reset(): void {
    this.animals = [];
    this.snakeEggStreak = 0;
  }
}
