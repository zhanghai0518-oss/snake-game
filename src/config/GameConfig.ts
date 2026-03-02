export interface GameConfig {
  gridWidth: number;
  gridHeight: number;
  cellSize: number;
  baseSpeed: number;
  wallCollision: boolean;
  gameMode: 'classic' | 'speed' | 'battle' | 'maze' | 'timeTrial' | 'survival';
}

export const DEFAULT_CONFIG: GameConfig = {
  gridWidth: 12,
  gridHeight: 12,
  cellSize: 50,
  baseSpeed: 500,
  wallCollision: true,
  gameMode: 'classic',
};
