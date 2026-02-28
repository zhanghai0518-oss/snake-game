import { GameConfig, DEFAULT_CONFIG } from '../config/GameConfig';
import { Position } from './Snake';

export interface GameModeConfig {
  id: string;
  name: string;
  description: string;
  emoji: string;
  baseConfig: Partial<GameConfig>;
  timeLimit?: number; // seconds, undefined = no limit
  obstaclesEnabled: boolean;
  dynamicObstacles: boolean;
  speedProgression: 'none' | 'gradual' | 'aggressive';
}

export interface GameModeRuntime {
  config: GameModeConfig;
  getSpeed(baseSpeed: number, snakeLength: number, elapsed: number): number;
  shouldSpawnObstacle(elapsed: number, obstacleCount: number): boolean;
  getScoreMultiplier(): number;
  isTimeUp(elapsed: number): boolean;
}

function createRuntime(config: GameModeConfig, overrides: Partial<GameModeRuntime> = {}): GameModeRuntime {
  return {
    config,
    getSpeed: (baseSpeed: number, _snakeLength: number, _elapsed: number) => baseSpeed,
    shouldSpawnObstacle: () => false,
    getScoreMultiplier: () => 1,
    isTimeUp: (_elapsed: number) =>
      config.timeLimit !== undefined ? _elapsed >= config.timeLimit : false,
    ...overrides,
  };
}

// ── Classic Mode ─────────────────────────────────────────────
const classicConfig: GameModeConfig = {
  id: 'classic',
  name: '经典模式',
  description: '碰墙或碰到自己就死亡，吃苹果加分，越来越快！',
  emoji: '🍎',
  baseConfig: { wallCollision: true, gameMode: 'classic', baseSpeed: 500 },
  obstaclesEnabled: false,
  dynamicObstacles: false,
  speedProgression: 'gradual',
};

export const ClassicMode: GameModeRuntime = createRuntime(classicConfig, {
  getSpeed(baseSpeed: number, snakeLength: number) {
    const extra = Math.max(0, snakeLength - 3);
    return Math.max(100, baseSpeed - extra * 15);
  },
});

// ── Speed Mode ───────────────────────────────────────────────
const speedConfig: GameModeConfig = {
  id: 'speed',
  name: '极速模式',
  description: '速度飞快且不断加速，看你能坚持多久！',
  emoji: '⚡',
  baseConfig: { wallCollision: true, gameMode: 'speed', baseSpeed: 250 },
  obstaclesEnabled: false,
  dynamicObstacles: false,
  speedProgression: 'aggressive',
};

export const SpeedMode: GameModeRuntime = createRuntime(speedConfig, {
  getSpeed(baseSpeed: number, snakeLength: number, elapsed: number) {
    const timeBoost = Math.floor(elapsed / 5) * 10; // every 5s faster by 10ms
    const lengthBoost = Math.max(0, snakeLength - 3) * 10;
    return Math.max(60, baseSpeed - timeBoost - lengthBoost);
  },
  getScoreMultiplier: () => 2,
});

// ── Maze Mode ────────────────────────────────────────────────
const mazeConfig: GameModeConfig = {
  id: 'maze',
  name: '迷宫模式',
  description: '地图中有障碍物墙壁，小心躲避！',
  emoji: '🧱',
  baseConfig: { wallCollision: true, gameMode: 'maze', baseSpeed: 400 },
  obstaclesEnabled: true,
  dynamicObstacles: false,
  speedProgression: 'gradual',
};

export const MazeMode: GameModeRuntime = createRuntime(mazeConfig, {
  getSpeed(baseSpeed: number, snakeLength: number) {
    const extra = Math.max(0, snakeLength - 3);
    return Math.max(120, baseSpeed - extra * 12);
  },
  getScoreMultiplier: () => 1.5,
});

// ── Time Trial Mode ──────────────────────────────────────────
const timeTrialConfig: GameModeConfig = {
  id: 'timeTrial',
  name: '限时模式',
  description: '60秒内尽可能多吃食物，争分夺秒！',
  emoji: '⏱️',
  baseConfig: { wallCollision: true, gameMode: 'timeTrial', baseSpeed: 350 },
  timeLimit: 60,
  obstaclesEnabled: false,
  dynamicObstacles: false,
  speedProgression: 'none',
};

export const TimeTrialMode: GameModeRuntime = createRuntime(timeTrialConfig, {
  getSpeed(baseSpeed: number) {
    return baseSpeed; // constant speed
  },
  getScoreMultiplier: () => 1,
});

// ── Survival Mode ────────────────────────────────────────────
const survivalConfig: GameModeConfig = {
  id: 'survival',
  name: '生存模式',
  description: '障碍物不断出现且越来越多，活下去！',
  emoji: '💀',
  baseConfig: { wallCollision: true, gameMode: 'survival', baseSpeed: 400 },
  obstaclesEnabled: true,
  dynamicObstacles: true,
  speedProgression: 'gradual',
};

export const SurvivalMode: GameModeRuntime = createRuntime(survivalConfig, {
  getSpeed(baseSpeed: number, snakeLength: number, elapsed: number) {
    const timeBoost = Math.floor(elapsed / 10) * 5;
    const extra = Math.max(0, snakeLength - 3);
    return Math.max(100, baseSpeed - extra * 10 - timeBoost);
  },
  shouldSpawnObstacle(elapsed: number, obstacleCount: number): boolean {
    // Every 8 seconds a new obstacle, up to 30
    const desired = Math.floor(elapsed / 8) + 1;
    return obstacleCount < desired && obstacleCount < 30;
  },
  getScoreMultiplier: () => 2,
});

// ── Registry ─────────────────────────────────────────────────
export const ALL_MODES: GameModeRuntime[] = [
  ClassicMode,
  SpeedMode,
  MazeMode,
  TimeTrialMode,
  SurvivalMode,
];

export function getModeById(id: string): GameModeRuntime | undefined {
  return ALL_MODES.find(m => m.config.id === id);
}
