import { Position } from './Snake';
import { GameConfig } from '../config/GameConfig';

export enum FoodType {
  NORMAL = 'normal',
  SPEED = 'speed',
  GOLDEN = 'golden',
  SHRINK = 'shrink',
}

export class Food {
  position: Position;
  type: FoodType;
  points: number;
  growAmount: number;
  color: string;
  emoji: string;

  constructor(pos: Position, type: FoodType) {
    this.position = pos;
    this.type = type;
    
    switch (type) {
      case FoodType.NORMAL:
        this.points = 10; this.growAmount = 1;
        this.color = '#ff4444'; this.emoji = '🍎'; break;
      case FoodType.SPEED:
        this.points = 20; this.growAmount = 0;
        this.color = '#44ff44'; this.emoji = '⚡'; break;
      case FoodType.GOLDEN:
        this.points = 50; this.growAmount = 3;
        this.color = '#ffdd44'; this.emoji = '🌟'; break;
      case FoodType.SHRINK:
        this.points = 5; this.growAmount = -1;
        this.color = '#4444ff'; this.emoji = '💎'; break;
    }
  }

  static spawn(config: GameConfig, snakeBody: Position[]): Food {
    let pos: Position;
    do {
      pos = {
        x: Math.floor(Math.random() * config.gridWidth),
        y: Math.floor(Math.random() * config.gridHeight),
      };
    } while (snakeBody.some(s => s.x === pos.x && s.y === pos.y));
    
    return new Food(pos, FoodType.NORMAL);
  }

  static spawnSpecial(config: GameConfig, snakeBody: Position[]): Food {
    let pos: Position;
    do {
      pos = {
        x: Math.floor(Math.random() * config.gridWidth),
        y: Math.floor(Math.random() * config.gridHeight),
      };
    } while (snakeBody.some(s => s.x === pos.x && s.y === pos.y));
    
    const types = [FoodType.SPEED, FoodType.GOLDEN, FoodType.SHRINK];
    const type = types[Math.floor(Math.random() * types.length)];
    return new Food(pos, type);
  }
}
