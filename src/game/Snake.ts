import { GameConfig } from '../config/GameConfig';

export enum Direction {
  UP = 'up',
  DOWN = 'down',
  LEFT = 'left',
  RIGHT = 'right',
}

export interface Position {
  x: number;
  y: number;
}

export class Snake {
  body: Position[];
  private direction: Direction = Direction.RIGHT;
  private nextDirection: Direction = Direction.RIGHT;
  private config: GameConfig;
  private growQueue: number = 0;
  skinId: string = 'default';

  constructor(config: GameConfig) {
    this.config = config;
    const startX = Math.floor(config.gridWidth / 2);
    const startY = Math.floor(config.gridHeight / 2);
    this.body = [
      { x: startX, y: startY },
      { x: startX - 1, y: startY },
      { x: startX - 2, y: startY },
    ];
  }

  setDirection(dir: Direction): void {
    const opposites: Record<Direction, Direction> = {
      [Direction.UP]: Direction.DOWN,
      [Direction.DOWN]: Direction.UP,
      [Direction.LEFT]: Direction.RIGHT,
      [Direction.RIGHT]: Direction.LEFT,
    };
    if (dir !== opposites[this.direction]) {
      this.nextDirection = dir;
    }
  }

  move(): void {
    this.direction = this.nextDirection;
    const head = this.body[0];
    const newHead: Position = { ...head };

    switch (this.direction) {
      case Direction.UP:    newHead.y -= 1; break;
      case Direction.DOWN:  newHead.y += 1; break;
      case Direction.LEFT:  newHead.x -= 1; break;
      case Direction.RIGHT: newHead.x += 1; break;
    }

    this.body.unshift(newHead);

    if (this.growQueue > 0) {
      this.growQueue--;
    } else {
      this.body.pop();
    }
  }

  grow(amount: number = 1): void {
    this.growQueue += amount;
  }

  headAt(pos: Position): boolean {
    return this.body[0].x === pos.x && this.body[0].y === pos.y;
  }

  hitsWall(): boolean {
    const head = this.body[0];
    return head.x < 0 || head.x >= this.config.gridWidth ||
           head.y < 0 || head.y >= this.config.gridHeight;
  }

  hitsSelf(): boolean {
    const head = this.body[0];
    return this.body.slice(1).some(seg => seg.x === head.x && seg.y === head.y);
  }

  wrapAround(): void {
    const head = this.body[0];
    if (head.x < 0) head.x = this.config.gridWidth - 1;
    if (head.x >= this.config.gridWidth) head.x = 0;
    if (head.y < 0) head.y = this.config.gridHeight - 1;
    if (head.y >= this.config.gridHeight) head.y = 0;
  }

  get head(): Position { return this.body[0]; }
  get length(): number { return this.body.length; }
}
