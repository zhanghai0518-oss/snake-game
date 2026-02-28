import { Game } from './game/Game';

function init(): void {
  const canvas = document.getElementById('game-canvas') as HTMLCanvasElement;
  
  // Responsive sizing
  const size = Math.min(window.innerWidth, window.innerHeight, 600);
  canvas.width = size;
  canvas.height = size;

  const game = new Game(canvas, {
    gridWidth: 20,
    gridHeight: 20,
    wallCollision: true,
    gameMode: 'classic',
  });

  // Start button
  document.getElementById('start-btn')?.addEventListener('click', () => {
    document.getElementById('menu')?.classList.add('hidden');
    game.start();
  });

  // Resize handler
  window.addEventListener('resize', () => {
    const newSize = Math.min(window.innerWidth, window.innerHeight, 600);
    canvas.width = newSize;
    canvas.height = newSize;
  });
}

document.addEventListener('DOMContentLoaded', init);
