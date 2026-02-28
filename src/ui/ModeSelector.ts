import { ALL_MODES, GameModeRuntime } from '../game/GameModes';

export class ModeSelector {
  private container: HTMLDivElement;
  private onSelect: (mode: GameModeRuntime) => void;

  constructor(parent: HTMLElement, onSelect: (mode: GameModeRuntime) => void) {
    this.onSelect = onSelect;
    this.container = document.createElement('div');
    this.container.className = 'mode-selector';
    Object.assign(this.container.style, {
      display: 'flex',
      flexWrap: 'wrap',
      justifyContent: 'center',
      gap: '16px',
      padding: '24px',
    });
    parent.appendChild(this.container);
    this.render();
  }

  private getHighScore(modeId: string): number {
    const raw = localStorage.getItem(`snake_high_${modeId}`);
    return raw ? parseInt(raw, 10) : 0;
  }

  private render(): void {
    this.container.innerHTML = '';

    const title = document.createElement('h2');
    title.textContent = '🐍 选择游戏模式';
    Object.assign(title.style, {
      width: '100%',
      textAlign: 'center',
      fontFamily: 'sans-serif',
      color: '#eee',
      margin: '0 0 8px 0',
    });
    this.container.appendChild(title);

    ALL_MODES.forEach(mode => {
      const card = document.createElement('div');
      card.className = 'mode-card';
      Object.assign(card.style, {
        width: '180px',
        padding: '20px 16px',
        borderRadius: '12px',
        background: 'rgba(255,255,255,0.08)',
        border: '2px solid rgba(255,255,255,0.15)',
        cursor: 'pointer',
        textAlign: 'center',
        fontFamily: 'sans-serif',
        color: '#eee',
        transition: 'transform 0.15s, border-color 0.15s',
      });

      card.addEventListener('mouseenter', () => {
        card.style.transform = 'scale(1.05)';
        card.style.borderColor = '#4caf50';
      });
      card.addEventListener('mouseleave', () => {
        card.style.transform = 'scale(1)';
        card.style.borderColor = 'rgba(255,255,255,0.15)';
      });

      const high = this.getHighScore(mode.config.id);

      card.innerHTML = `
        <div style="font-size:40px;margin-bottom:8px">${mode.config.emoji}</div>
        <div style="font-size:18px;font-weight:bold;margin-bottom:6px">${mode.config.name}</div>
        <div style="font-size:13px;color:#aaa;margin-bottom:10px;line-height:1.4">${mode.config.description}</div>
        <div style="font-size:12px;color:#ffc107">🏆 最高分: ${high}</div>
      `;

      card.addEventListener('click', () => {
        this.onSelect(mode);
      });

      this.container.appendChild(card);
    });
  }

  show(): void {
    this.container.style.display = 'flex';
    this.render(); // refresh high scores
  }

  hide(): void {
    this.container.style.display = 'none';
  }

  destroy(): void {
    this.container.remove();
  }
}
