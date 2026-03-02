export interface GameConfig {
  gridWidth: number;
  gridHeight: number;
  cellSize: number;
  baseSpeed: number;
  wallCollision: boolean;
  gameMode: 'classic' | 'speed' | 'battle' | 'maze' | 'timeTrial' | 'survival';
}

export const DEFAULT_CONFIG: GameConfig = {
  gridWidth: 15,
  gridHeight: 15,
  cellSize: 40,
  baseSpeed: 500,
  wallCollision: true,
  gameMode: 'classic',
};
