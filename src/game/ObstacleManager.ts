import { Position } from './Snake';
import { GameConfig } from '../config/GameConfig';

export class ObstacleManager {
  private obstacles: Position[] = [];
  private config: GameConfig;

  constructor(config: GameConfig) {
    this.config = config;
  }

  /** Generate a maze layout with walls */
  generateMaze(): void {
    this.obstacles = [];
    const w = this.config.gridWidth;
    const h = this.config.gridHeight;
    const cx = Math.floor(w / 2);
    const cy = Math.floor(h / 2);

    // Horizontal walls with gaps
    for (let x = 4; x < w - 4; x++) {
      if (x !== cx && x !== cx - 1) {
        this.obstacles.push({ x, y: Math.floor(h / 3) });
        this.obstacles.push({ x, y: Math.floor((2 * h) / 3) });
      }
    }
    // Vertical walls with gaps
    for (let y = 4; y < h - 4; y++) {
      if (y !== cy && y !== cy - 1) {
        this.obstacles.push({ x: Math.floor(w / 3), y });
        this.obstacles.push({ x: Math.floor((2 * w) / 3), y });
      }
    }
  }

  /** Add a single random obstacle avoiding occupied positions */
  addRandomObstacle(occupied: Position[]): void {
    const all = [...occupied, ...this.obstacles];
    for (let attempt = 0; attempt < 100; attempt++) {
      const pos: Position = {
        x: Math.floor(Math.random() * this.config.gridWidth),
        y: Math.floor(Math.random() * this.config.gridHeight),
      };
      if (!all.some(p => p.x === pos.x && p.y === pos.y)) {
        this.obstacles.push(pos);
        return;
      }
    }
  }

  /** Check if a position collides with any obstacle */
  collides(pos: Position): boolean {
    return this.obstacles.some(o => o.x === pos.x && o.y === pos.y);
  }

  /** Check if a position is occupied by an obstacle */
  isOccupied(pos: Position): boolean {
    return this.collides(pos);
  }

  getAll(): Position[] {
    return this.obstacles;
  }

  get count(): number {
    return this.obstacles.length;
  }

  reset(): void {
    this.obstacles = [];
  }
}
