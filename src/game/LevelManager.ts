import { AnimalType } from './AnimalManager';

export interface LevelConfig {
  level: number;
  name: string;
  targetScore: number;
  scoreMultiplier: number;
  baseSpeed: number;
  maxAnimals: number;
  availableAnimals: string[];
  availableEnemies: string[];
  hasBoss: boolean;
  bossType?: string;
  riverDanger: number;
  farmerEnabled: boolean;
}

const LEVELS: LevelConfig[] = [
  {
    level: 1, name: '草原猎场', targetScore: 200, scoreMultiplier: 1,
    baseSpeed: 500, maxAnimals: 3,
    availableAnimals: [AnimalType.MOUSE, AnimalType.BIRD_EGG],
    availableEnemies: [],
    hasBoss: false, riverDanger: 0, farmerEnabled: false,
  },
  {
    level: 2, name: '沼泽迷踪', targetScore: 500, scoreMultiplier: 1.5,
    baseSpeed: 420, maxAnimals: 4,
    availableAnimals: [AnimalType.MOUSE, AnimalType.FROG, AnimalType.BIRD_EGG],
    availableEnemies: [AnimalType.HEDGEHOG],
    hasBoss: false, riverDanger: 0, farmerEnabled: false,
  },
  {
    level: 3, name: '毒雾森林', targetScore: 1000, scoreMultiplier: 2,
    baseSpeed: 350, maxAnimals: 5,
    availableAnimals: [AnimalType.MOUSE, AnimalType.FROG, AnimalType.BIRD_EGG, AnimalType.RABBIT],
    availableEnemies: [AnimalType.HEDGEHOG, AnimalType.POISON_FROG],
    hasBoss: false, riverDanger: 8, farmerEnabled: false,
  },
  {
    level: 4, name: '鹰击长空', targetScore: 2000, scoreMultiplier: 2.5,
    baseSpeed: 280, maxAnimals: 6,
    availableAnimals: [AnimalType.MOUSE, AnimalType.FROG, AnimalType.BIRD_EGG, AnimalType.RABBIT],
    availableEnemies: [AnimalType.HEDGEHOG, AnimalType.POISON_FROG, AnimalType.EAGLE],
    hasBoss: false, riverDanger: 6, farmerEnabled: false,
  },
  {
    level: 5, name: '农夫与蛇', targetScore: 3500, scoreMultiplier: 3,
    baseSpeed: 230, maxAnimals: 7,
    availableAnimals: [AnimalType.MOUSE, AnimalType.FROG, AnimalType.BIRD_EGG, AnimalType.RABBIT],
    availableEnemies: [AnimalType.HEDGEHOG, AnimalType.POISON_FROG, AnimalType.EAGLE],
    hasBoss: true, bossType: 'crocodile_king', riverDanger: 4, farmerEnabled: true,
  },
  {
    level: 6, name: '狮王领地', targetScore: 5000, scoreMultiplier: 3.5,
    baseSpeed: 190, maxAnimals: 8,
    availableAnimals: [AnimalType.MOUSE, AnimalType.FROG, AnimalType.BIRD_EGG, AnimalType.RABBIT],
    availableEnemies: [AnimalType.HEDGEHOG, AnimalType.POISON_FROG, AnimalType.EAGLE],
    hasBoss: true, bossType: 'lion', riverDanger: 3, farmerEnabled: true,
  },
  {
    level: 7, name: '龙之巢穴', targetScore: Infinity, scoreMultiplier: 5,
    baseSpeed: 150, maxAnimals: 9,
    availableAnimals: [AnimalType.MOUSE, AnimalType.FROG, AnimalType.BIRD_EGG, AnimalType.RABBIT],
    availableEnemies: [AnimalType.HEDGEHOG, AnimalType.POISON_FROG, AnimalType.EAGLE],
    hasBoss: true, bossType: 'dragon', riverDanger: 2, farmerEnabled: true,
  },
];

export class LevelManager {
  getCurrentLevel(score: number): LevelConfig {
    // Find the highest level whose targetScore the player hasn't yet reached
    for (let i = LEVELS.length - 1; i >= 0; i--) {
      if (i === 0) return LEVELS[0];
      if (score >= LEVELS[i - 1].targetScore) return LEVELS[i];
    }
    return LEVELS[0];
  }

  isLevelUp(oldScore: number, newScore: number): boolean {
    const oldLevel = this.getCurrentLevel(oldScore);
    const newLevel = this.getCurrentLevel(newScore);
    return newLevel.level > oldLevel.level;
  }

  getLevelProgress(score: number): number {
    const level = this.getCurrentLevel(score);
    if (!isFinite(level.targetScore)) return 0; // infinite level

    // Get the previous level's target as the base
    const prevTarget = level.level > 1 ? LEVELS[level.level - 2].targetScore : 0;
    const range = level.targetScore - prevTarget;
    if (range <= 0) return 1;
    return Math.min(1, (score - prevTarget) / range);
  }

  getAllLevelConfigs(): LevelConfig[] {
    return LEVELS;
  }
}
