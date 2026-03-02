import { Game } from './game/Game';
import { SettingsUI } from './ui/SettingsUI';
import { MainMenu } from './ui/MainMenu';

function init(): void {
  const canvas = document.getElementById('game-canvas') as HTMLCanvasElement;

  // Responsive sizing
  const resize = (): void => {
    const size = Math.min(window.innerWidth, window.innerHeight, 600);
    canvas.width = size;
    canvas.height = size;
  };
  resize();
  window.addEventListener('resize', resize);

  // Hide legacy menu if present
  document.getElementById('menu')?.classList.add('hidden');

  const settingsUI = new SettingsUI();
  const mainMenu = new MainMenu();

  let game: Game | null = null;

  const startGame = (): void => {
    const s = settingsUI.getSettings();
    const gridSize = settingsUI.getGridSize();

    game = new Game(canvas, {
      gridWidth: gridSize,
      gridHeight: gridSize,
      wallCollision: s.wallCollision,
      baseSpeed: settingsUI.getSpeed(),
      gameMode: 'classic',
    });

    mainMenu.hide();
    game.start();
  };

  mainMenu.on('start', startGame);

  mainMenu.on('multiplayer', () => {
    alert('多人对战功能开发中，敬请期待！');
  });

  mainMenu.on('skins', () => {
    alert('皮肤商店功能开发中，敬请期待！');
  });

  mainMenu.on('settings', () => {
    settingsUI.show(() => {
      // settings closed — no-op, changes saved automatically
    });
  });

  mainMenu.on('leaderboard', () => {
    alert('排行榜功能开发中，敬请期待！');
  });
}

document.addEventListener('DOMContentLoaded', init);
