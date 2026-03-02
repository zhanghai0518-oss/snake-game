export interface GameSettings {
  soundEnabled: boolean;
  volume: number;
  difficulty: 'easy' | 'normal' | 'hard';
  mapSize: 'small' | 'medium' | 'large';
  wallCollision: boolean;
  controlScheme: 'arrows' | 'wasd' | 'joystick';
  showFPS: boolean;
}

const DIFFICULTY_SPEED: Record<string, number> = {
  easy: 500,
  normal: 350,
  hard: 200,
};

const MAP_SIZES: Record<string, number> = {
  small: 15,
  medium: 20,
  large: 30,
};

const STORAGE_KEY = 'snake-game-settings';

export class SettingsUI {
  private container: HTMLDivElement;
  private settings: GameSettings;
  private onClose: (() => void) | null = null;

  constructor() {
    this.settings = this.loadSettings();
    this.container = document.createElement('div');
    this.container.id = 'settings-overlay';
    this.container.innerHTML = this.buildHTML();
    this.applyStyles();
    document.body.appendChild(this.container);
    this.container.style.display = 'none';
    this.bindEvents();
  }

  private loadSettings(): GameSettings {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) return { ...this.defaults(), ...JSON.parse(raw) };
    } catch { /* ignore */ }
    return this.defaults();
  }

  private defaults(): GameSettings {
    return {
      soundEnabled: true,
      volume: 0.7,
      difficulty: 'normal',
      mapSize: 'medium',
      wallCollision: true,
      controlScheme: 'arrows',
      showFPS: false,
    };
  }

  private saveSettings(): void {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(this.settings));
  }

  getSettings(): GameSettings {
    return { ...this.settings };
  }

  getSpeed(): number {
    return DIFFICULTY_SPEED[this.settings.difficulty] ?? 350;
  }

  getGridSize(): number {
    return MAP_SIZES[this.settings.mapSize] ?? 20;
  }

  show(onClose?: () => void): void {
    this.onClose = onClose ?? null;
    this.syncUI();
    this.container.style.display = 'flex';
  }

  hide(): void {
    this.container.style.display = 'none';
    this.onClose?.();
  }

  private buildHTML(): string {
    return `
      <div class="settings-panel">
        <h2>⚙️ 设置</h2>

        <div class="setting-row">
          <label>音效</label>
          <label class="toggle"><input type="checkbox" id="s-sound"><span class="slider"></span></label>
        </div>

        <div class="setting-row">
          <label>音量</label>
          <input type="range" id="s-volume" min="0" max="1" step="0.05">
          <span id="s-volume-val"></span>
        </div>

        <div class="setting-row">
          <label>难度</label>
          <select id="s-difficulty">
            <option value="easy">简单 (500ms)</option>
            <option value="normal">普通 (350ms)</option>
            <option value="hard">困难 (200ms)</option>
          </select>
        </div>

        <div class="setting-row">
          <label>地图大小</label>
          <select id="s-mapsize">
            <option value="small">小 (15×15)</option>
            <option value="medium">中 (20×20)</option>
            <option value="large">大 (30×30)</option>
          </select>
        </div>

        <div class="setting-row">
          <label>墙壁碰撞</label>
          <label class="toggle"><input type="checkbox" id="s-wall"><span class="slider"></span></label>
        </div>

        <div class="setting-row">
          <label>控制方式</label>
          <select id="s-control">
            <option value="arrows">方向键</option>
            <option value="wasd">WASD</option>
            <option value="joystick">虚拟摇杆</option>
          </select>
        </div>

        <div class="setting-row">
          <label>显示FPS</label>
          <label class="toggle"><input type="checkbox" id="s-fps"><span class="slider"></span></label>
        </div>

        <div class="setting-row">
          <label>最高分</label>
          <button id="s-reset-score" class="btn-danger">重置最高分</button>
        </div>

        <button id="s-close" class="btn-primary">保存并返回</button>
      </div>
    `;
  }

  private applyStyles(): void {
    if (document.getElementById('settings-styles')) return;
    const style = document.createElement('style');
    style.id = 'settings-styles';
    style.textContent = `
      #settings-overlay {
        position: fixed; inset: 0; z-index: 1000;
        display: flex; align-items: center; justify-content: center;
        background: rgba(0,0,0,0.8);
      }
      .settings-panel {
        background: #1a1a2e; color: #e0e0e0; border-radius: 12px;
        padding: 24px 32px; width: 380px; max-height: 90vh; overflow-y: auto;
        box-shadow: 0 0 30px rgba(0,255,100,0.15);
        font-family: 'Segoe UI', sans-serif;
      }
      .settings-panel h2 {
        text-align: center; margin: 0 0 20px; color: #00ff66; font-size: 22px;
      }
      .setting-row {
        display: flex; align-items: center; justify-content: space-between;
        padding: 10px 0; border-bottom: 1px solid #2a2a4a;
      }
      .setting-row label:first-child { font-size: 14px; min-width: 80px; }
      .setting-row select, .setting-row input[type=range] {
        background: #16213e; color: #e0e0e0; border: 1px solid #0f3460;
        border-radius: 6px; padding: 4px 8px; font-size: 13px;
      }
      .setting-row input[type=range] { width: 120px; }
      .toggle { position: relative; width: 44px; height: 24px; cursor: pointer; }
      .toggle input { opacity: 0; width: 0; height: 0; }
      .toggle .slider {
        position: absolute; inset: 0; background: #444; border-radius: 24px; transition: .3s;
      }
      .toggle .slider::before {
        content: ''; position: absolute; width: 18px; height: 18px;
        left: 3px; top: 3px; background: #fff; border-radius: 50%; transition: .3s;
      }
      .toggle input:checked + .slider { background: #00ff66; }
      .toggle input:checked + .slider::before { transform: translateX(20px); }
      .btn-primary {
        display: block; width: 100%; margin-top: 20px; padding: 10px;
        background: #00ff66; color: #1a1a2e; border: none; border-radius: 8px;
        font-size: 16px; font-weight: bold; cursor: pointer;
      }
      .btn-primary:hover { background: #00cc52; }
      .btn-danger {
        padding: 6px 14px; background: #e74c3c; color: #fff; border: none;
        border-radius: 6px; cursor: pointer; font-size: 13px;
      }
      .btn-danger:hover { background: #c0392b; }
      #s-volume-val { min-width: 32px; text-align: right; font-size: 13px; }
    `;
    document.head.appendChild(style);
  }

  private el<T extends HTMLElement>(id: string): T {
    return this.container.querySelector(`#${id}`) as T;
  }

  private syncUI(): void {
    this.el<HTMLInputElement>('s-sound').checked = this.settings.soundEnabled;
    const vol = this.el<HTMLInputElement>('s-volume');
    vol.value = String(this.settings.volume);
    this.el<HTMLSpanElement>('s-volume-val').textContent = Math.round(this.settings.volume * 100) + '%';
    (this.el<HTMLSelectElement>('s-difficulty')).value = this.settings.difficulty;
    (this.el<HTMLSelectElement>('s-mapsize')).value = this.settings.mapSize;
    this.el<HTMLInputElement>('s-wall').checked = this.settings.wallCollision;
    (this.el<HTMLSelectElement>('s-control')).value = this.settings.controlScheme;
    this.el<HTMLInputElement>('s-fps').checked = this.settings.showFPS;
  }

  private bindEvents(): void {
    this.el<HTMLInputElement>('s-sound').addEventListener('change', (e) => {
      this.settings.soundEnabled = (e.target as HTMLInputElement).checked;
      this.saveSettings();
    });

    this.el<HTMLInputElement>('s-volume').addEventListener('input', (e) => {
      this.settings.volume = parseFloat((e.target as HTMLInputElement).value);
      this.el<HTMLSpanElement>('s-volume-val').textContent = Math.round(this.settings.volume * 100) + '%';
      this.saveSettings();
    });

    this.el<HTMLSelectElement>('s-difficulty').addEventListener('change', (e) => {
      this.settings.difficulty = (e.target as HTMLSelectElement).value as GameSettings['difficulty'];
      this.saveSettings();
    });

    this.el<HTMLSelectElement>('s-mapsize').addEventListener('change', (e) => {
      this.settings.mapSize = (e.target as HTMLSelectElement).value as GameSettings['mapSize'];
      this.saveSettings();
    });

    this.el<HTMLInputElement>('s-wall').addEventListener('change', (e) => {
      this.settings.wallCollision = (e.target as HTMLInputElement).checked;
      this.saveSettings();
    });

    this.el<HTMLSelectElement>('s-control').addEventListener('change', (e) => {
      this.settings.controlScheme = (e.target as HTMLSelectElement).value as GameSettings['controlScheme'];
      this.saveSettings();
    });

    this.el<HTMLInputElement>('s-fps').addEventListener('change', (e) => {
      this.settings.showFPS = (e.target as HTMLInputElement).checked;
      this.saveSettings();
    });

    this.el<HTMLButtonElement>('s-reset-score').addEventListener('click', () => {
      if (confirm('确定要重置最高分吗？')) {
        localStorage.removeItem('snake-high-score');
        alert('最高分已重置！');
      }
    });

    this.el<HTMLButtonElement>('s-close').addEventListener('click', () => this.hide());
  }
}
