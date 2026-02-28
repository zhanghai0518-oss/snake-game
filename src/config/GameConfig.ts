export interface GameConfig {
  gridWidth: number;
  gridHeight: number;
  cellSize: number;
  baseSpeed: number;
  wallCollision: boolean;
  gameMode: 'classic' | 'speed' | 'battle';
}

export const DEFAULT_CONFIG: GameConfig = {
  gridWidth: 20,
  gridHeight: 20,
  cellSize: 20,
  baseSpeed: 300,
  wallCollision: true,
  gameMode: 'classic',
};
