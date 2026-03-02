import { Boss, BossType, BossCollisionResult } from './Boss';
import { Position } from './Snake';
import { GameConfig } from '../config/GameConfig';

/**
 * BOSS生命周期管理器
 * 根据关卡配置生成和管理BOSS
 */
export class BossManager {
  private boss: Boss | null = null;
  private config: GameConfig;
  private bossDefeated: Set<string> = new Set();

  // Bezier point function from TerrainManager (for crocodile king river swimming)
  private bezierPointFn: ((t: number) => { x: number; y: number }) | null = null;
  private cellSize: number;

  constructor(config: GameConfig) {
    this.config = config;
    this.cellSize = config.cellSize;
  }

  setBezierPointFn(fn: (t: number) => { x: number; y: number }): void {
    this.bezierPointFn = fn;
  }

  /** Spawn boss for current level if applicable */
  spawnBoss(bossType: string, level: number): void {
    const key = `${bossType}_${level}`;
    if (this.bossDefeated.has(key)) return;
    if (this.boss && this.boss.alive) return;

    this.boss = new Boss(bossType as BossType, this.config);
  }

  getBoss(): Boss | null {
    return this.boss;
  }

  hasBoss(): boolean {
    return this.boss !== null && this.boss.alive;
  }

  update(deltaSeconds: number): void {
    if (!this.boss || !this.boss.alive) return;
    this.boss.update(deltaSeconds, this.bezierPointFn || undefined, this.cellSize);
  }

  checkCollision(snakeHead: Position, snakeLength: number): BossCollisionResult | null {
    if (!this.boss || !this.boss.alive) return null;
    return this.boss.checkCollision(snakeHead, snakeLength);
  }

  onBossDefeated(bossType: string, level: number): void {
    this.bossDefeated.add(`${bossType}_${level}`);
    this.boss = null;
  }

  reset(): void {
    this.boss = null;
    this.bossDefeated.clear();
  }
}
