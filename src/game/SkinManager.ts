/**
 * 蛇皮肤系统 - 管理5种蛇皮肤的解锁、存储和渲染
 */

export interface SkinColors {
  /** 蛇头中心颜色 */
  headCenter: string;
  /** 蛇头边缘颜色 */
  headEdge: string;
  /** 蛇身起始颜色 (靠近头部) */
  bodyStart: string;
  /** 蛇身结束颜色 (靠近尾部) */
  bodyEnd: string;
}

export interface SkinEffect {
  /** 发光颜色，null表示无发光 */
  glowColor: string | null;
  /** 发光半径 */
  glowRadius: number;
  /** 是否有拖尾粒子 */
  hasTrail: boolean;
  /** 拖尾颜色 */
  trailColor: string;
}

export interface HeadStyle {
  /** 眼睛颜色 */
  eyeColor: string;
  /** 眼睛大小比例 (相对cellSize) */
  eyeSize: number;
  /** 头部圆角 */
  borderRadius: number;
  /** 额外装饰 emoji (如王冠) */
  decoration: string | null;
}

export interface SkinDefinition {
  id: string;
  name: string;
  description: string;
  colors: SkinColors;
  headStyle: HeadStyle;
  effect: SkinEffect;
  /** 解锁所需最低分数，0表示默认解锁 */
  unlockScore: number;
}

const SKINS: SkinDefinition[] = [
  {
    id: 'classic-green',
    name: '经典绿',
    description: '经典贪吃蛇配色，默认皮肤',
    colors: {
      headCenter: '#00ff88',
      headEdge: '#00cc66',
      bodyStart: 'rgba(0, 200, 100, 1)',
      bodyEnd: 'rgba(0, 160, 80, 0.5)',
    },
    headStyle: {
      eyeColor: '#ffffff',
      eyeSize: 0.08,
      borderRadius: 4,
      decoration: null,
    },
    effect: { glowColor: null, glowRadius: 0, hasTrail: false, trailColor: '' },
    unlockScore: 0,
  },
  {
    id: 'neon-blue',
    name: '霓虹蓝',
    description: '赛博朋克风格，带霓虹发光效果',
    colors: {
      headCenter: '#00e5ff',
      headEdge: '#0091ea',
      bodyStart: 'rgba(0, 229, 255, 1)',
      bodyEnd: 'rgba(0, 145, 234, 0.5)',
    },
    headStyle: {
      eyeColor: '#e0f7fa',
      eyeSize: 0.09,
      borderRadius: 5,
      decoration: null,
    },
    effect: { glowColor: '#00e5ff', glowRadius: 8, hasTrail: true, trailColor: 'rgba(0, 229, 255, 0.3)' },
    unlockScore: 50,
  },
  {
    id: 'flame-red',
    name: '火焰红',
    description: '炽热火焰，燃烧吧蛇蛇！',
    colors: {
      headCenter: '#ff5722',
      headEdge: '#d84315',
      bodyStart: 'rgba(255, 87, 34, 1)',
      bodyEnd: 'rgba(255, 193, 7, 0.6)',
    },
    headStyle: {
      eyeColor: '#ffeb3b',
      eyeSize: 0.09,
      borderRadius: 4,
      decoration: null,
    },
    effect: { glowColor: '#ff5722', glowRadius: 10, hasTrail: true, trailColor: 'rgba(255, 87, 34, 0.25)' },
    unlockScore: 100,
  },
  {
    id: 'golden-dragon',
    name: '金龙',
    description: '尊贵金龙，头戴王冠',
    colors: {
      headCenter: '#ffd700',
      headEdge: '#ff8f00',
      bodyStart: 'rgba(255, 215, 0, 1)',
      bodyEnd: 'rgba(255, 143, 0, 0.6)',
    },
    headStyle: {
      eyeColor: '#b71c1c',
      eyeSize: 0.1,
      borderRadius: 6,
      decoration: '👑',
    },
    effect: { glowColor: '#ffd700', glowRadius: 12, hasTrail: true, trailColor: 'rgba(255, 215, 0, 0.2)' },
    unlockScore: 200,
  },
  {
    id: 'pixel',
    name: '像素风',
    description: '复古像素风格，方方正正',
    colors: {
      headCenter: '#ab47bc',
      headEdge: '#7b1fa2',
      bodyStart: 'rgba(171, 71, 188, 1)',
      bodyEnd: 'rgba(123, 31, 162, 0.5)',
    },
    headStyle: {
      eyeColor: '#f3e5f5',
      eyeSize: 0.12,
      borderRadius: 0,
      decoration: null,
    },
    effect: { glowColor: null, glowRadius: 0, hasTrail: false, trailColor: '' },
    unlockScore: 150,
  },
];

const STORAGE_KEY = 'snake_unlocked_skins';
const SELECTED_KEY = 'snake_selected_skin';

export class SkinManager {
  private unlockedIds: Set<string>;
  private selectedId: string;
  private readonly skins: ReadonlyArray<SkinDefinition> = SKINS;

  constructor() {
    this.unlockedIds = this.loadUnlocked();
    // 经典绿始终解锁
    this.unlockedIds.add('classic-green');
    this.selectedId = this.loadSelected();
  }

  /** 获取所有皮肤定义 */
  getAllSkins(): ReadonlyArray<SkinDefinition> {
    return this.skins;
  }

  /** 获取当前选中的皮肤 */
  getSelectedSkin(): SkinDefinition {
    return this.skins.find(s => s.id === this.selectedId) ?? this.skins[0];
  }

  /** 选择皮肤（必须已解锁） */
  selectSkin(id: string): boolean {
    if (!this.unlockedIds.has(id)) return false;
    this.selectedId = id;
    this.saveSelected();
    return true;
  }

  /** 检查皮肤是否已解锁 */
  isUnlocked(id: string): boolean {
    return this.unlockedIds.has(id);
  }

  /** 根据分数检查并解锁新皮肤，返回新解锁的皮肤列表 */
  checkUnlocks(score: number): SkinDefinition[] {
    const newlyUnlocked: SkinDefinition[] = [];
    for (const skin of this.skins) {
      if (!this.unlockedIds.has(skin.id) && score >= skin.unlockScore) {
        this.unlockedIds.add(skin.id);
        newlyUnlocked.push(skin);
      }
    }
    if (newlyUnlocked.length > 0) {
      this.saveUnlocked();
    }
    return newlyUnlocked;
  }

  /** 渲染蛇身体段 */
  renderSegment(
    ctx: CanvasRenderingContext2D,
    x: number, y: number,
    cellSize: number,
    segmentIndex: number,
    totalSegments: number,
  ): void {
    const skin = this.getSelectedSkin();
    const isHead = segmentIndex === 0;
    const cx = (x + 0.5) * cellSize;
    const cy = (y + 0.5) * cellSize;

    // 发光效果
    if (skin.effect.glowColor) {
      ctx.shadowColor = skin.effect.glowColor;
      ctx.shadowBlur = skin.effect.glowRadius;
    }

    // 渐变
    const gradient = ctx.createRadialGradient(cx, cy, 0, cx, cy, cellSize / 2);
    if (isHead) {
      gradient.addColorStop(0, skin.colors.headCenter);
      gradient.addColorStop(1, skin.colors.headEdge);
    } else {
      const t = segmentIndex / totalSegments;
      const alpha = 1 - t * 0.5;
      // 线性插值 bodyStart → bodyEnd
      gradient.addColorStop(0, this.interpolateColor(skin.colors.bodyStart, skin.colors.bodyEnd, t, alpha));
      gradient.addColorStop(1, this.interpolateColor(skin.colors.bodyStart, skin.colors.bodyEnd, t, alpha * 0.8));
    }

    ctx.fillStyle = gradient;
    const padding = isHead ? 0 : 1;
    const radius = skin.headStyle.borderRadius;
    ctx.beginPath();
    ctx.roundRect(
      x * cellSize + padding,
      y * cellSize + padding,
      cellSize - padding * 2,
      cellSize - padding * 2,
      isHead ? radius : Math.max(radius - 2, 0),
    );
    ctx.fill();

    // 拖尾
    if (skin.effect.hasTrail && !isHead) {
      ctx.fillStyle = skin.effect.trailColor;
      ctx.beginPath();
      ctx.arc(cx, cy, cellSize * 0.15, 0, Math.PI * 2);
      ctx.fill();
    }

    // 头部装饰
    if (isHead) {
      // 眼睛
      ctx.shadowBlur = 0;
      ctx.fillStyle = skin.headStyle.eyeColor;
      const es = cellSize * skin.headStyle.eyeSize;
      ctx.beginPath();
      ctx.arc((x + 0.3) * cellSize, (y + 0.35) * cellSize, es, 0, Math.PI * 2);
      ctx.arc((x + 0.7) * cellSize, (y + 0.35) * cellSize, es, 0, Math.PI * 2);
      ctx.fill();

      // 装饰 emoji
      if (skin.headStyle.decoration) {
        ctx.font = `${cellSize * 0.5}px Arial`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'bottom';
        ctx.fillText(skin.headStyle.decoration, cx, y * cellSize);
      }
    }

    ctx.shadowBlur = 0;
  }

  /** 简单颜色插值（基于rgba字符串，返回rgba） */
  private interpolateColor(start: string, end: string, t: number, alpha: number): string {
    const s = this.parseRGBA(start);
    const e = this.parseRGBA(end);
    const r = Math.round(s.r + (e.r - s.r) * t);
    const g = Math.round(s.g + (e.g - s.g) * t);
    const b = Math.round(s.b + (e.b - s.b) * t);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  }

  private parseRGBA(color: string): { r: number; g: number; b: number } {
    const m = color.match(/(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/);
    if (m) return { r: +m[1], g: +m[2], b: +m[3] };
    return { r: 0, g: 200, b: 100 };
  }

  private loadUnlocked(): Set<string> {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) return new Set(JSON.parse(raw) as string[]);
    } catch { /* ignore */ }
    return new Set<string>();
  }

  private saveUnlocked(): void {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify([...this.unlockedIds])); } catch { /* ignore */ }
  }

  private loadSelected(): string {
    try {
      const id = localStorage.getItem(SELECTED_KEY);
      if (id && this.unlockedIds.has(id)) return id;
    } catch { /* ignore */ }
    return 'classic-green';
  }

  private saveSelected(): void {
    try { localStorage.setItem(SELECTED_KEY, this.selectedId); } catch { /* ignore */ }
  }
}
