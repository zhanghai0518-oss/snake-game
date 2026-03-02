export interface GameConfig {
  gridWidth: number;
  gridHeight: number;
  cellSize: number;
  baseSpeed: number;
  wallCollision: boolean;
  wallKill: boolean;
  gameMode: 'classic' | 'speed' | 'battle' | 'maze' | 'timeTrial' | 'survival';
}

export const DEFAULT_CONFIG: GameConfig = {
  gridWidth: 20,
  gridHeight: 20,
  cellSize: 30,
  baseSpeed: 500,
  wallCollision: true,
  wallKill: true,
  gameMode: 'classic',
};
