export class MainMenu {
  private container: HTMLDivElement;
  private animFrame: number = 0;
  private titleCanvas: HTMLCanvasElement;
  private titleCtx: CanvasRenderingContext2D;

  private callbacks: Record<string, (() => void)> = {};

  constructor() {
    this.container = document.createElement('div');
    this.container.id = 'main-menu-overlay';
    this.titleCanvas = document.createElement('canvas');
    this.titleCanvas.width = 360;
    this.titleCanvas.height = 80;
    this.titleCtx = this.titleCanvas.getContext('2d')!;

    this.container.innerHTML = this.buildHTML();
    this.container.querySelector('#title-anim-slot')!.replaceWith(this.titleCanvas);
    this.titleCanvas.id = 'title-anim-slot';
    this.applyStyles();
    document.body.appendChild(this.container);

    this.bindButtons();
    this.animateTitle();
    this.updateHighScore();
  }

  on(event: string, cb: () => void): void {
    this.callbacks[event] = cb;
  }

  show(): void {
    this.updateHighScore();
    this.container.style.display = 'flex';
  }

  hide(): void {
    this.container.style.display = 'none';
  }

  private buildHTML(): string {
    const highScore = localStorage.getItem('snake-high-score') ?? '0';
    return `
      <div class="menu-panel">
        <div id="title-anim-slot"></div>
        <div class="menu-buttons">
          <button data-action="start" class="menu-btn">🎮 开始游戏</button>
          <button data-action="multiplayer" class="menu-btn">👥 多人对战</button>
          <button data-action="skins" class="menu-btn">🎨 皮肤商店</button>
          <button data-action="settings" class="menu-btn">⚙️ 设置</button>
          <button data-action="leaderboard" class="menu-btn">🏆 排行榜</button>
        </div>
        <div class="menu-footer">
          <span>v1.0.0</span>
          <span id="menu-highscore">最高分: ${highScore}</span>
        </div>
      </div>
    `;
  }

  private applyStyles(): void {
    if (document.getElementById('mainmenu-styles')) return;
    const style = document.createElement('style');
    style.id = 'mainmenu-styles';
    style.textContent = `
      #main-menu-overlay {
        position: fixed; inset: 0; z-index: 900;
        display: flex; align-items: center; justify-content: center;
        background: radial-gradient(ellipse at center, #1a1a2e 0%, #0a0a15 100%);
      }
      .menu-panel {
        display: flex; flex-direction: column; align-items: center; gap: 20px;
      }
      #title-anim-slot { display: block; }
      .menu-buttons { display: flex; flex-direction: column; gap: 12px; width: 260px; }
      .menu-btn {
        padding: 12px; font-size: 16px; font-weight: 600;
        background: linear-gradient(135deg, #16213e, #0f3460);
        color: #00ff66; border: 1px solid #00ff6644; border-radius: 10px;
        cursor: pointer; transition: all .2s; font-family: 'Segoe UI', sans-serif;
      }
      .menu-btn:hover {
        background: linear-gradient(135deg, #0f3460, #1a1a6e);
        transform: scale(1.04); box-shadow: 0 0 16px rgba(0,255,100,0.25);
      }
      .menu-footer {
        display: flex; justify-content: space-between; width: 260px;
        color: #556; font-size: 12px; margin-top: 8px;
      }
    `;
    document.head.appendChild(style);
  }

  private bindButtons(): void {
    this.container.querySelectorAll('.menu-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        const action = (btn as HTMLElement).dataset.action;
        if (action && this.callbacks[action]) this.callbacks[action]();
      });
    });
  }

  private updateHighScore(): void {
    const el = this.container.querySelector('#menu-highscore');
    if (el) el.textContent = '最高分: ' + (localStorage.getItem('snake-high-score') ?? '0');
  }

  private animateTitle(): void {
    const text = '🐍 贪吃蛇';
    const ctx = this.titleCtx;
    const w = this.titleCanvas.width;
    const h = this.titleCanvas.height;
    let tick = 0;

    const draw = (): void => {
      ctx.clearRect(0, 0, w, h);
      ctx.font = 'bold 36px "Segoe UI", sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';

      // Draw each character with wave offset
      const chars = [...text];
      const totalW = ctx.measureText(text).width;
      let x = (w - totalW) / 2;

      for (let i = 0; i < chars.length; i++) {
        const charW = ctx.measureText(chars[i]).width;
        const yOff = Math.sin((tick + i * 8) * 0.08) * 6;
        const hue = (tick * 2 + i * 30) % 360;
        ctx.fillStyle = `hsl(${hue}, 100%, 60%)`;
        ctx.textAlign = 'left';
        ctx.fillText(chars[i], x, h / 2 + yOff);
        x += charW;
      }

      tick++;
      this.animFrame = requestAnimationFrame(draw);
    };

    draw();
  }

  destroy(): void {
    cancelAnimationFrame(this.animFrame);
    this.container.remove();
  }
}
