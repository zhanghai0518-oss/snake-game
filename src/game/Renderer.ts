import { Snake } from './Snake';
import { Food } from './Food';
import { GameConfig } from '../config/GameConfig';
import { GameState } from './Game';

export class Renderer {
  private ctx: CanvasRenderingContext2D;
  private config: GameConfig;
  private cellSize: number;

  constructor(ctx: CanvasRenderingContext2D, config: GameConfig) {
    this.ctx = ctx;
    this.config = config;
    this.cellSize = Math.min(
      ctx.canvas.width / config.gridWidth,
      ctx.canvas.height / config.gridHeight
    );
  }

  clear(): void {
    this.ctx.fillStyle = '#1a1a2e';
    this.ctx.fillRect(0, 0, this.ctx.canvas.width, this.ctx.canvas.height);
  }

  drawGrid(): void {
    this.ctx.strokeStyle = '#16213e';
    this.ctx.lineWidth = 0.5;
    for (let x = 0; x <= this.config.gridWidth; x++) {
      this.ctx.beginPath();
      this.ctx.moveTo(x * this.cellSize, 0);
      this.ctx.lineTo(x * this.cellSize, this.config.gridHeight * this.cellSize);
      this.ctx.stroke();
    }
    for (let y = 0; y <= this.config.gridHeight; y++) {
      this.ctx.beginPath();
      this.ctx.moveTo(0, y * this.cellSize);
      this.ctx.lineTo(this.config.gridWidth * this.cellSize, y * this.cellSize);
      this.ctx.stroke();
    }
  }

  drawSnake(snake: Snake): void {
    snake.body.forEach((seg, i) => {
      const isHead = i === 0;
      const gradient = this.ctx.createRadialGradient(
        (seg.x + 0.5) * this.cellSize, (seg.y + 0.5) * this.cellSize, 0,
        (seg.x + 0.5) * this.cellSize, (seg.y + 0.5) * this.cellSize, this.cellSize / 2
      );
      
      if (isHead) {
        gradient.addColorStop(0, '#00ff88');
        gradient.addColorStop(1, '#00cc66');
      } else {
        const fade = 1 - (i / snake.body.length) * 0.5;
        gradient.addColorStop(0, `rgba(0, 200, 100, ${fade})`);
        gradient.addColorStop(1, `rgba(0, 160, 80, ${fade})`);
      }
      
      this.ctx.fillStyle = gradient;
      const padding = isHead ? 0 : 1;
      this.ctx.beginPath();
      this.ctx.roundRect(
        seg.x * this.cellSize + padding,
        seg.y * this.cellSize + padding,
        this.cellSize - padding * 2,
        this.cellSize - padding * 2,
        isHead ? 4 : 2
      );
      this.ctx.fill();

      // Draw eyes on head
      if (isHead) {
        this.ctx.fillStyle = '#fff';
        this.ctx.beginPath();
        this.ctx.arc(
          (seg.x + 0.3) * this.cellSize, (seg.y + 0.35) * this.cellSize, 2, 0, Math.PI * 2);
        this.ctx.arc(
          (seg.x + 0.7) * this.cellSize, (seg.y + 0.35) * this.cellSize, 2, 0, Math.PI * 2);
        this.ctx.fill();
      }
    });
  }

  drawFood(food: Food): void {
    const x = (food.position.x + 0.5) * this.cellSize;
    const y = (food.position.y + 0.5) * this.cellSize;
    
    // Glow effect
    this.ctx.shadowColor = food.color;
    this.ctx.shadowBlur = 10;
    
    this.ctx.font = `${this.cellSize * 0.8}px Arial`;
    this.ctx.textAlign = 'center';
    this.ctx.textBaseline = 'middle';
    this.ctx.fillText(food.emoji, x, y);
    
    this.ctx.shadowBlur = 0;
  }

  drawUI(score: number, highScore: number, state: GameState): void {
    this.ctx.fillStyle = '#ffffff';
    this.ctx.font = 'bold 16px Arial';
    this.ctx.textAlign = 'left';
    this.ctx.fillText(`分数: ${score}`, 10, 25);
    this.ctx.textAlign = 'right';
    this.ctx.fillText(`最高: ${highScore}`, this.ctx.canvas.width - 10, 25);
    
    if (state === GameState.PAUSED) {
      this.ctx.fillStyle = 'rgba(0,0,0,0.5)';
      this.ctx.fillRect(0, 0, this.ctx.canvas.width, this.ctx.canvas.height);
      this.ctx.fillStyle = '#fff';
      this.ctx.font = 'bold 32px Arial';
      this.ctx.textAlign = 'center';
      this.ctx.fillText('⏸ 暂停', this.ctx.canvas.width / 2, this.ctx.canvas.height / 2);
    }
  }

  drawGameOver(score: number): void {
    this.ctx.fillStyle = 'rgba(0,0,0,0.7)';
    this.ctx.fillRect(0, 0, this.ctx.canvas.width, this.ctx.canvas.height);
    
    this.ctx.fillStyle = '#ff4444';
    this.ctx.font = 'bold 36px Arial';
    this.ctx.textAlign = 'center';
    this.ctx.fillText('💀 游戏结束', this.ctx.canvas.width / 2, this.ctx.canvas.height / 2 - 30);
    
    this.ctx.fillStyle = '#ffffff';
    this.ctx.font = '24px Arial';
    this.ctx.fillText(`得分: ${score}`, this.ctx.canvas.width / 2, this.ctx.canvas.height / 2 + 15);
    
    this.ctx.font = '16px Arial';
    this.ctx.fillStyle = '#aaaaaa';
    this.ctx.fillText('按 R 重新开始', this.ctx.canvas.width / 2, this.ctx.canvas.height / 2 + 50);
  }
}
