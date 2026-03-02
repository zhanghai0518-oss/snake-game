import { Position, Direction } from './Snake';
import { GameConfig } from '../config/GameConfig';
import { BuffSystem, BuffType } from './BuffSystem';

export type AnimalCategory = 'prey' | 'predator' | 'powerup';

export enum AnimalType {
  // Prey
  MOUSE = 'mouse',
  FROG = 'frog',
  RABBIT = 'rabbit',
  SNAKE_EGG = 'snake_egg',
  CRICKET = 'cricket',
  // Predators
  EAGLE = 'eagle',
  HEDGEHOG = 'hedgehog',
  POISON_FROG = 'poison_frog',
  // Powerups
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
  { type: AnimalType.CRICKET,     category: 'prey',     emoji: '🦗', probability: 0.12, growAmount: 1, points: 10 },
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

  // Eagle-specific
  private eagleDirection: Position = { x: 1, y: 0 };

  // Poison frog flash state
  flashOn: boolean = true;
  private flashTimer: number = 0;

  constructor(pos: Position, def: AnimalDef, config: GameConfig) {
    this.position = { ...pos };
    this.def = def;
    this.config = config;

    if (def.type === AnimalType.EAGLE) {
      // Pick a random direction for the eagle
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
        // Static
        break;

      case AnimalType.FROG:
        if (this.aiTimer >= 2000) {
          this.aiTimer = 0;
          this.moveRandom(1);
        }
        break;

      case AnimalType.RABBIT:
        this.updateRabbit(deltaMs, snakeHead);
        break;

      case AnimalType.CRICKET:
        if (this.aiTimer >= 300) {
          this.aiTimer = 0;
          this.moveRandom(1);
        }
        break;

      case AnimalType.EAGLE:
        if (this.aiTimer >= 150) {
          this.aiTimer = 0;
          this.position.x += this.eagleDirection.x;
          this.position.y += this.eagleDirection.y;
          if (this.isOutOfBounds()) {
            this.alive = false;
          }
        }
        break;

      case AnimalType.HEDGEHOG:
        if (this.aiTimer >= 1000) {
          this.aiTimer = 0;
          this.moveRandom(1);
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

  private updateRabbit(_deltaMs: number, snakeHead: Position): void {
    const dx = snakeHead.x - this.position.x;
    const dy = snakeHead.y - this.position.y;
    const dist = Math.abs(dx) + Math.abs(dy);

    if (dist <= 3 && this.aiTimer >= 400) {
      this.aiTimer = 0;
      // Flee away from snake
      const fleeX = dx !== 0 ? (dx > 0 ? -1 : 1) : 0;
      const fleeY = dy !== 0 ? (dy > 0 ? -1 : 1) : 0;
      // Pick primary flee axis
      if (Math.abs(dx) >= Math.abs(dy)) {
        this.tryMove(fleeX, 0);
      } else {
        this.tryMove(0, fleeY);
      }
    }
  }

  private moveRandom(steps: number): void {
    const dirs = [{ x: 0, y: -1 }, { x: 0, y: 1 }, { x: -1, y: 0 }, { x: 1, y: 0 }];
    for (let i = 0; i < steps; i++) {
      const d = dirs[Math.floor(Math.random() * dirs.length)];
      this.tryMove(d.x, d.y);
    }
  }

  private tryMove(dx: number, dy: number): void {
    const nx = this.position.x + dx;
    const ny = this.position.y + dy;
    if (nx >= 0 && nx < this.config.gridWidth && ny >= 0 && ny < this.config.gridHeight) {
      this.position.x = nx;
      this.position.y = ny;
    }
  }

  private isOutOfBounds(): boolean {
    return this.position.x < -1 || this.position.x > this.config.gridWidth ||
           this.position.y < -1 || this.position.y > this.config.gridHeight;
  }
}

export interface CollisionResult {
  animal: Animal;
  growAmount: number;
  points: number;
  buffType?: BuffType;
  buffDurationMs?: number;
  special?: 'poison' | 'stun' | 'speed_boost';
}

export class AnimalManager {
  private animals: Animal[] = [];
  private config: GameConfig;
  private maxAnimals: number = 8;
  private snakeEggStreak: number = 0;

  constructor(config: GameConfig) {
    this.config = config;
  }

  getAnimals(): Animal[] {
    return this.animals;
  }

  update(deltaMs: number, snakeHead: Position, snakeBody: Position[], buffSystem: BuffSystem): void {
    const frozen = buffSystem.has(BuffType.FREEZE_ENEMIES);

    for (const animal of this.animals) {
      if (frozen && animal.def.category === 'predator') {
        animal.frozen = true;
      } else {
        animal.frozen = false;
      }
      animal.update(deltaMs, snakeHead);
    }

    // Magnet: move prey toward snake
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

    // Remove dead animals
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

      case AnimalType.CRICKET:
        result.special = 'speed_boost';
        result.buffType = BuffType.SPEED_BOOST;
        result.buffDurationMs = 3000;
        break;

      case AnimalType.EAGLE:
        // -3 handled by growAmount
        break;

      case AnimalType.HEDGEHOG:
        result.special = 'stun';
        result.buffType = BuffType.STUN;
        result.buffDurationMs = 1500;
        break;

      case AnimalType.POISON_FROG:
        result.special = 'poison';
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

    // Reset egg streak if not egg
    if (animal.def.type !== AnimalType.SNAKE_EGG) {
      this.snakeEggStreak = 0;
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
    const r = Math.random();
    let cumulative = 0;
    for (const def of ANIMAL_DEFS) {
      cumulative += def.probability;
      if (r < cumulative) return def;
    }
    return ANIMAL_DEFS[0]; // fallback: mouse
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
