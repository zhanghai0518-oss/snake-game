import { GameConfig } from '../config/GameConfig';
import { Position } from './Snake';

interface Bush {
  gridX: number;
  gridY: number;
  width: number;  // in grid cells
  height: number;
  circles: Array<{ ox: number; oy: number; r: number; color: string }>;
}

interface RiverPoint {
  x: number;
  y: number;
}

interface Crocodile {
  gridX: number;
  gridY: number;
  spawnTime: number;
  duration: number;
  // River swimming: t is position along bezier curve
  riverT: number;
  riverSpeed: number;
  riverDirection: number;
}

export interface CrocodileCollisionResult {
  hit: boolean;
  /** 'damage' | 'immune' | 'eat' */
  type?: 'damage' | 'immune' | 'eat';
}

interface Decoration {
  x: number;
  y: number;
  type: 'flower' | 'grass';
  color: string;
  size: number;
}

/**
 * 地形管理器 - 生成土黄色地面、灌木、河流、装饰
 */
export class TerrainManager {
  private config: GameConfig;
  private cellSize: number;
  private bushes: Bush[] = [];
  private staticCanvas: OffscreenCanvas | null = null;  // 预渲染静态元素
  private riverPoints: RiverPoint[] = [];
  private riverGridCells: Set<string> = new Set();
  private crocodiles: Crocodile[] = [];
  private decorations: Decoration[] = [];
  private dirtTexture: Array<{ x: number; y: number; shade: number }> = [];
  private lastCrocSpawn: number = -5;  // 首只鳄鱼5秒后出现
  private currentTime: number = 0;
  private currentLevel: number = 1;
  
  // 农夫系统
  private farmerPos: Position;
  private farmerDir: number = 1;
  private farmerTimer: number = 0;
  private farmerEnabled: boolean = false;
  private riverEdgeCells: Position[] = [];

  // River bezier control points for rendering
  private riverCP: { p0: RiverPoint; p1: RiverPoint; p2: RiverPoint; p3: RiverPoint };

  constructor(config: GameConfig) {
    this.config = config;
    this.cellSize = config.cellSize;
    this.riverCP = { p0: { x: 0, y: 0 }, p1: { x: 0, y: 0 }, p2: { x: 0, y: 0 }, p3: { x: 0, y: 0 } };
    this.farmerPos = { x: Math.floor(config.gridWidth / 2), y: 0 };
    this.generate();
    this.computeRiverEdgeCells();
  }

  private generate(): void {
    this.staticCanvas = null;
    this.overlayCanvas = null;
    this.generateDirtTexture();
    this.generateRiver();
    this.generateBushes();
    this.generateDecorations();
  }

  private generateDirtTexture(): void {
    // Random patches for dirt variation
    for (let i = 0; i < 40; i++) {
      this.dirtTexture.push({
        x: Math.random() * this.config.gridWidth * this.cellSize,
        y: Math.random() * this.config.gridHeight * this.cellSize,
        shade: Math.random() * 0.15 - 0.075, // ±7.5% brightness variation
      });
    }
  }

  private generateRiver(): void {
    const gw = this.config.gridWidth;
    const gh = this.config.gridHeight;
    const cs = this.cellSize;

    // S-shaped river from top to bottom
    const startX = 2 + Math.random() * 3;
    const endX = gw - 2 - Math.random() * 3;

    this.riverCP = {
      p0: { x: startX * cs, y: -cs },
      p1: { x: (gw * 0.7) * cs, y: gh * 0.3 * cs },
      p2: { x: (gw * 0.2) * cs, y: gh * 0.7 * cs },
      p3: { x: endX * cs, y: (gh + 1) * cs },
    };

    // Pre-compute river grid cells by sampling the bezier
    const riverWidth = 4.5; // grid cells wide
    for (let t = 0; t <= 1; t += 0.005) {
      const pt = this.bezierPoint(t);
      const gx = Math.floor(pt.x / cs);
      const gy = Math.floor(pt.y / cs);
      for (let dx = -Math.ceil(riverWidth / 2); dx <= Math.ceil(riverWidth / 2); dx++) {
        const cellX = gx + dx;
        if (cellX >= 0 && cellX < gw && gy >= 0 && gy < gh) {
          // Check distance from bezier center
          const cellCenterX = (cellX + 0.5) * cs;
          const dist = Math.abs(cellCenterX - pt.x) / cs;
          if (dist < riverWidth / 2) {
            this.riverGridCells.add(`${cellX},${gy}`);
          }
        }
      }
    }
  }

  private bezierPoint(t: number): RiverPoint {
    const cp = this.riverCP;
    const u = 1 - t;
    return {
      x: u * u * u * cp.p0.x + 3 * u * u * t * cp.p1.x + 3 * u * t * t * cp.p2.x + t * t * t * cp.p3.x,
      y: u * u * u * cp.p0.y + 3 * u * u * t * cp.p1.y + 3 * u * t * t * cp.p2.y + t * t * t * cp.p3.y,
    };
  }

  private generateBushes(): void {
    const gw = this.config.gridWidth;
    const gh = this.config.gridHeight;
    const cs = this.cellSize; // 30px

    // 9条灌木：2长(~100×20px=3.3×0.67格) + 3中(~60×20px=2×0.67格) + 4短(~30×20px=1×0.67格)
    const bushConfigs: Array<{ widthCells: number; heightCells: number }> = [
      // 2条长灌木 (~100×20px → 3.3×0.67格，取4×1)
      { widthCells: 4, heightCells: 1 },
      { widthCells: 4, heightCells: 1 },
      // 3条中灌木 (~60×20px → 2×0.67格，取2×1)
      { widthCells: 2, heightCells: 1 },
      { widthCells: 2, heightCells: 1 },
      { widthCells: 2, heightCells: 1 },
      // 4条短灌木 (~30×20px → 1×0.67格，取1×1)
      { widthCells: 1, heightCells: 1 },
      { widthCells: 1, heightCells: 1 },
      { widthCells: 1, heightCells: 1 },
      { widthCells: 1, heightCells: 1 },
    ];

    for (const cfg of bushConfigs) {
      // 随机决定水平或垂直放置
      const isHorizontal = Math.random() > 0.5;
      const w = isHorizontal ? cfg.widthCells : cfg.heightCells;
      const h = isHorizontal ? cfg.heightCells : cfg.widthCells;

      let gx: number, gy: number;
      let attempts = 0;
      let placed = false;
      do {
        gx = Math.floor(Math.random() * (gw - w));
        gy = Math.floor(Math.random() * (gh - h));
        // 检查灌木每一格都不在河里
        let overlapsRiver = false;
        for (let dx = 0; dx < w && !overlapsRiver; dx++) {
          for (let dy = 0; dy < h && !overlapsRiver; dy++) {
            if (this.isInRiver({ x: gx + dx, y: gy + dy })) {
              overlapsRiver = true;
            }
          }
        }
        if (!overlapsRiver) {
          placed = true;
          break;
        }
      } while (++attempts < 30);
      if (!placed) continue;

      // 生成装饰圆
      const circles: Bush['circles'] = [];
      const greens = ['#1a8c0e', '#22aa15', '#158a08', '#2ebc1e', '#0d7a05'];
      const numCircles = (w + h) * 2 + 3;

      for (let c = 0; c < numCircles; c++) {
        const along = (c / numCircles) - 0.5;
        const cross = (Math.random() - 0.5) * 0.6;
        circles.push({
          ox: (isHorizontal ? along : cross) * w * cs,
          oy: (isHorizontal ? cross : along) * h * cs,
          r: cs * (0.4 + Math.random() * 0.35),
          color: greens[Math.floor(Math.random() * greens.length)],
        });
      }

      this.bushes.push({ gridX: gx, gridY: gy, width: w, height: h, circles });
    }
  }

  private generateDecorations(): void {
    const count = 20 + Math.floor(Math.random() * 15);
    // Very muted colors
    const flowerColors = ['rgba(180,150,140,0.4)', 'rgba(170,170,130,0.4)', 'rgba(160,140,150,0.4)'];
    const grassColors = ['rgba(160,180,130,0.3)', 'rgba(150,170,120,0.3)'];

    for (let i = 0; i < count; i++) {
      const isFlower = Math.random() < 0.3;
      this.decorations.push({
        x: Math.random() * this.config.gridWidth * this.cellSize,
        y: Math.random() * this.config.gridHeight * this.cellSize,
        type: isFlower ? 'flower' : 'grass',
        color: isFlower
          ? flowerColors[Math.floor(Math.random() * flowerColors.length)]
          : grassColors[Math.floor(Math.random() * grassColors.length)],
        size: 1.5 + Math.random() * 2,
      });
    }
  }

  private computeRiverEdgeCells(): void {
    this.riverEdgeCells = [];
    const gw = this.config.gridWidth;
    const gh = this.config.gridHeight;
    for (let x = 0; x < gw; x++) {
      for (let y = 0; y < gh; y++) {
        if (this.riverGridCells.has(`${x},${y}`)) continue;
        // Check if adjacent to river
        const adjacent = [
          { x: x - 1, y }, { x: x + 1, y },
          { x, y: y - 1 }, { x, y: y + 1 },
        ];
        for (const a of adjacent) {
          if (this.riverGridCells.has(`${a.x},${a.y}`)) {
            this.riverEdgeCells.push({ x, y });
            break;
          }
        }
      }
    }
  }

  /** Set current level for crocodile duration scaling */
  setLevel(level: number): void {
    this.currentLevel = level;
  }

  setFarmerEnabled(enabled: boolean): void {
    this.farmerEnabled = enabled;
    if (enabled && this.riverEdgeCells.length > 0) {
      // Place farmer on a river edge cell
      const cell = this.riverEdgeCells[Math.floor(Math.random() * this.riverEdgeCells.length)];
      this.farmerPos = { ...cell };
    }
  }

  /** Expose bezier point calculation for BossManager */
  getBezierPoint(t: number): { x: number; y: number } {
    return this.bezierPoint(t);
  }

  /** Check crocodile collision with snake length awareness */
  checkCrocodileCollision(pos: Position, snakeLength: number): CrocodileCollisionResult {
    for (const croc of this.crocodiles) {
      const elapsed = this.currentTime - croc.spawnTime;
      if (elapsed >= 0 && elapsed < croc.duration && croc.gridX === pos.x && croc.gridY === pos.y) {
        if (snakeLength > 20) {
          // Remove the crocodile
          croc.duration = 0; // mark as expired
          return { hit: true, type: 'eat' };
        } else if (snakeLength > 15) {
          return { hit: true, type: 'immune' };
        } else {
          return { hit: true, type: 'damage' };
        }
      }
    }
    return { hit: false };
  }

  // ==================== Render ====================

  render(ctx: CanvasRenderingContext2D, time: number): void {
    this.currentTime = time;
    this.updateCrocodiles(time);

    // 预渲染静态元素到离屏canvas（只执行一次）
    if (!this.staticCanvas) {
      const w = this.config.gridWidth * this.cellSize;
      const h = this.config.gridHeight * this.cellSize;
      this.staticCanvas = new OffscreenCanvas(w, h);
      const sctx = this.staticCanvas.getContext('2d')! as unknown as CanvasRenderingContext2D;
      // 只渲染灌木（去掉土地圆圈和装饰圆圈）
      this.renderBushBases(sctx);
      this.renderBushTops(sctx);
    }

    // 绘制预渲染的静态层
    ctx.drawImage(this.staticCanvas, 0, 0);

    // 只有河流需要每帧动画
    this.renderRiver(ctx, time);

    // 农夫需要每帧更新位置
    this.renderFarmer(ctx, time);
  }

  private overlayCanvas: OffscreenCanvas | null = null;

  renderOverlay(ctx: CanvasRenderingContext2D, _time: number): void {
    // 预渲染灌木遮罩层（只执行一次）
    if (!this.overlayCanvas) {
      const w = this.config.gridWidth * this.cellSize;
      const h = this.config.gridHeight * this.cellSize;
      this.overlayCanvas = new OffscreenCanvas(w, h);
      const octx = this.overlayCanvas.getContext('2d')! as unknown as CanvasRenderingContext2D;
      this.renderBushTops(octx);
    }
    ctx.drawImage(this.overlayCanvas, 0, 0);
  }

  private renderDirtTexture(ctx: CanvasRenderingContext2D): void {
    // Dirt patches
    for (const patch of this.dirtTexture) {
      const alpha = Math.abs(patch.shade);
      ctx.fillStyle = patch.shade > 0
        ? `rgba(255,255,200,${alpha})`
        : `rgba(100,70,30,${alpha})`;
      ctx.beginPath();
      ctx.arc(patch.x, patch.y, 15 + (patch.shade + 0.1) * 200, 0, Math.PI * 2);  // 用固定值代替random
      ctx.fill();
    }
  }

  private renderDecorations(ctx: CanvasRenderingContext2D): void {
    ctx.save();
    for (const d of this.decorations) {
      ctx.fillStyle = d.color;
      if (d.type === 'flower') {
        // Tiny dot flower
        for (let i = 0; i < 4; i++) {
          const a = (i / 4) * Math.PI * 2;
          ctx.beginPath();
          ctx.arc(d.x + Math.cos(a) * d.size, d.y + Math.sin(a) * d.size, d.size * 0.6, 0, Math.PI * 2);
          ctx.fill();
        }
      } else {
        // Tiny grass strokes
        ctx.strokeStyle = d.color;
        ctx.lineWidth = 0.8;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(d.x, d.y);
        ctx.lineTo(d.x - 1, d.y - d.size * 2);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(d.x + 1.5, d.y);
        ctx.lineTo(d.x + 2.5, d.y - d.size * 1.8);
        ctx.stroke();
      }
    }
    ctx.restore();
  }

  private renderRiver(ctx: CanvasRenderingContext2D, time: number): void {
    const cp = this.riverCP;
    const cs = this.cellSize;
    const riverWidth = 4.5 * cs;

    ctx.save();

    // Water body
    ctx.strokeStyle = 'rgba(40, 120, 210, 0.7)';  // 河流更明显
    ctx.lineWidth = riverWidth;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    ctx.moveTo(cp.p0.x, cp.p0.y);
    ctx.bezierCurveTo(cp.p1.x, cp.p1.y, cp.p2.x, cp.p2.y, cp.p3.x, cp.p3.y);
    ctx.stroke();

    // Lighter center
    ctx.strokeStyle = 'rgba(80, 160, 230, 0.5)';  // 河流高光更明显
    ctx.lineWidth = riverWidth * 0.5;
    ctx.beginPath();
    ctx.moveTo(cp.p0.x, cp.p0.y);
    ctx.bezierCurveTo(cp.p1.x, cp.p1.y, cp.p2.x, cp.p2.y, cp.p3.x, cp.p3.y);
    ctx.stroke();

    // Ripple animation - small white lines moving along river
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
    ctx.lineWidth = 1.5;
    for (let i = 0; i < 8; i++) {
      const baseT = ((time * 0.05 + i * 0.125) % 1);
      const pt = this.bezierPoint(baseT);
      const pt2 = this.bezierPoint(Math.min(1, baseT + 0.02));
      ctx.beginPath();
      ctx.moveTo(pt.x - 8, pt.y);
      ctx.lineTo(pt2.x + 8, pt2.y);
      ctx.stroke();
    }

    // Draw crocodiles
    ctx.font = `${cs * 0.8}px "Apple Color Emoji", "Segoe UI Emoji", sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    for (const croc of this.crocodiles) {
      const elapsed = time - croc.spawnTime;
      if (elapsed >= 0 && elapsed < croc.duration) {
        // Fade in/out
        const fadeIn = Math.min(1, elapsed / 0.5);
        const fadeOut = Math.min(1, (croc.duration - elapsed) / 0.5);
        ctx.globalAlpha = fadeIn * fadeOut;
        const cx = (croc.gridX + 0.5) * cs;
        const cy = (croc.gridY + 0.5) * cs;
        ctx.fillText('🐊', cx, cy);
      }
    }
    ctx.globalAlpha = 1;

    ctx.restore();
  }

  private renderBushBases(ctx: CanvasRenderingContext2D): void {
    // Draw shadow/base under bushes
    const cs = this.cellSize;
    ctx.save();
    for (const bush of this.bushes) {
      const cx = (bush.gridX + bush.width / 2) * cs;
      const cy = (bush.gridY + bush.height / 2) * cs;
      // Shadow
      ctx.fillStyle = 'rgba(0,0,0,0.1)';
      ctx.beginPath();
      ctx.ellipse(cx, cy + bush.height * cs * 0.3, bush.width * cs * 0.4, bush.height * cs * 0.15, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  private renderBushTops(ctx: CanvasRenderingContext2D): void {
    const cs = this.cellSize;
    for (const bush of this.bushes) {
      const bx = bush.gridX * cs;
      const by = bush.gridY * cs;
      const bw = bush.width * cs;
      const bh = Math.max(bush.height * cs, cs); // 最小1格高

      // ===== 地面阴影 =====
      ctx.fillStyle = 'rgba(0,30,0,0.3)';
      ctx.beginPath();
      ctx.ellipse(bx + bw/2, by + bh + cs*0.1, bw*0.5 + cs*0.1, cs*0.12, 0, 0, Math.PI*2);
      ctx.fill();

      // ===== 灌木主体：用多个大椭圆沿长条排列 =====
      // 深绿底层
      ctx.fillStyle = '#0a5500';
      const segments = Math.max(2, Math.ceil(Math.max(bw, bh) / cs));
      const isWide = bw >= bh;
      
      for (let s = 0; s < segments; s++) {
        const t = (s + 0.5) / segments;
        const sx = isWide ? bx + t * bw : bx + bw/2;
        const sy = isWide ? by + bh/2 : by + t * bh;
        const rx = isWide ? cs * 0.55 : cs * 0.45;
        const ry = isWide ? cs * 0.45 : cs * 0.55;
        ctx.beginPath();
        ctx.ellipse(sx, sy + cs*0.05, rx, ry, 0, 0, Math.PI*2);
        ctx.fill();
      }

      // 中绿主层
      ctx.fillStyle = '#15850c';
      for (let s = 0; s < segments; s++) {
        const t = (s + 0.5) / segments;
        const sx = isWide ? bx + t * bw : bx + bw/2;
        const sy = isWide ? by + bh/2 : by + t * bh;
        const rx = isWide ? cs * 0.5 : cs * 0.4;
        const ry = isWide ? cs * 0.4 : cs * 0.5;
        // 每段高度略有不同，像灌木顶部凹凸
        const heightVar = Math.sin(s * 2.3) * cs * 0.06;
        ctx.beginPath();
        ctx.ellipse(sx, sy + heightVar, rx, ry, 0, 0, Math.PI*2);
        ctx.fill();
      }

      // 亮绿高光层
      ctx.fillStyle = '#22aa15';
      for (let s = 0; s < segments; s++) {
        const t = (s + 0.5) / segments;
        const sx = isWide ? bx + t * bw : bx + bw/2;
        const sy = isWide ? by + bh/2 : by + t * bh;
        const rx = isWide ? cs * 0.35 : cs * 0.28;
        const ry = isWide ? cs * 0.28 : cs * 0.35;
        const heightVar = Math.sin(s * 2.3) * cs * 0.06;
        ctx.beginPath();
        ctx.ellipse(sx, sy - cs*0.08 + heightVar, rx, ry, 0, 0, Math.PI*2);
        ctx.fill();
      }

      // ===== 叶片纹理 =====
      const leafCount = segments * 3;
      for (let j = 0; j < leafCount; j++) {
        const t = Math.random();
        const lx = isWide ? bx + t * bw : bx + bw/2 + (Math.random()-0.5) * cs * 0.5;
        const ly = isWide ? by + bh/2 + (Math.random()-0.5) * cs * 0.5 : by + t * bh;
        ctx.fillStyle = j % 2 === 0 ? '#33cc22' : '#1d9914';
        ctx.beginPath();
        ctx.ellipse(lx, ly, cs*0.08, cs*0.04, Math.random()*Math.PI, 0, Math.PI*2);
        ctx.fill();
      }

      // ===== 深色描边 =====
      ctx.strokeStyle = '#063d03';
      ctx.lineWidth = 2.5;
      for (let s = 0; s < segments; s++) {
        const t = (s + 0.5) / segments;
        const sx = isWide ? bx + t * bw : bx + bw/2;
        const sy = isWide ? by + bh/2 : by + t * bh;
        const rx = isWide ? cs * 0.52 : cs * 0.42;
        const ry = isWide ? cs * 0.42 : cs * 0.52;
        ctx.beginPath();
        ctx.ellipse(sx, sy, rx, ry, 0, 0, Math.PI*2);
        ctx.stroke();
      }

      // ===== 小高光点 =====
      ctx.fillStyle = 'rgba(200,255,180,0.3)';
      for (let s = 0; s < segments; s++) {
        const t = (s + 0.5) / segments;
        const sx = isWide ? bx + t * bw : bx + bw/2;
        const sy = isWide ? by + bh/2 : by + t * bh;
        ctx.beginPath();
        ctx.arc(sx - cs*0.1, sy - cs*0.15, cs*0.1, 0, Math.PI*2);
        ctx.fill();
      }
    }
  }


  private updateCrocodiles(time: number): void {
    // Only spawn crocs from level 3+
    if (this.currentLevel < 3) {
      this.crocodiles = [];
      return;
    }

    // Remove expired crocs
    this.crocodiles = this.crocodiles.filter(c => time - c.spawnTime < c.duration);

    // Update swimming crocs along river bezier
    for (const croc of this.crocodiles) {
      croc.riverT += croc.riverSpeed * croc.riverDirection * 0.016; // ~60fps
      if (croc.riverT > 0.95) { croc.riverT = 0.95; croc.riverDirection = -1; }
      if (croc.riverT < 0.05) { croc.riverT = 0.05; croc.riverDirection = 1; }
      const pt = this.bezierPoint(croc.riverT);
      croc.gridX = Math.floor(pt.x / this.cellSize);
      croc.gridY = Math.floor(pt.y / this.cellSize);
    }

    // Crocodile duration: 10s base + 5s per level above 3
    const crocDuration = 10 + (this.currentLevel - 3) * 5;

    // Spawn new croc every 8 seconds
    if (time - this.lastCrocSpawn >= 8) {
      this.lastCrocSpawn = time;
      const startT = 0.1 + Math.random() * 0.8;
      this.crocodiles.push({
        gridX: 0,
        gridY: 0,
        spawnTime: time,
        duration: crocDuration,
        riverT: startT,
        riverSpeed: 0.03 + Math.random() * 0.02,
        riverDirection: Math.random() > 0.5 ? 1 : -1,
      });
    }
  }

  // ==================== Query Methods ====================

  isInBush(pos: Position): boolean {
    for (const bush of this.bushes) {
      if (
        pos.x >= bush.gridX && pos.x < bush.gridX + bush.width &&
        pos.y >= bush.gridY && pos.y < bush.gridY + bush.height
      ) {
        return true;
      }
    }
    return false;
  }

  isInRiver(pos: Position): boolean {
    return this.riverGridCells.has(`${pos.x},${pos.y}`);
  }

  hasCrocodile(pos: Position): boolean {
    for (const croc of this.crocodiles) {
      const elapsed = this.currentTime - croc.spawnTime;
      if (elapsed >= 0 && elapsed < croc.duration && croc.gridX === pos.x && croc.gridY === pos.y) {
        return true;
      }
    }
    return false;
  }

  getSpeedMultiplier(pos: Position): number {
    return this.isInRiver(pos) ? 0.5 : 1.0;
  }

  /** Get bush regions for external use (e.g. animal opacity) */
  getBushes(): Array<{ gridX: number; gridY: number; width: number; height: number }> {
    return this.bushes.map(b => ({ gridX: b.gridX, gridY: b.gridY, width: b.width, height: b.height }));
  }

  // ==================== 农夫系统 ====================

  private renderFarmer(ctx: CanvasRenderingContext2D, time: number): void {
    // 农夫每3秒移动一格，随机巡逻
    this.farmerTimer += 0.016; // ~60fps
    if (this.farmerTimer >= 3) {
      this.farmerTimer = 0;
      // 随机移动
      const dirs = [
        { x: 1, y: 0 }, { x: -1, y: 0 }, { x: 0, y: 1 }, { x: 0, y: -1 },
        { x: 1, y: 1 }, { x: -1, y: -1 },
      ];
      const d = dirs[Math.floor(Math.random() * dirs.length)];
      const nx = this.farmerPos.x + d.x;
      const ny = this.farmerPos.y + d.y;
      if (nx >= 0 && nx < this.config.gridWidth && ny >= 0 && ny < this.config.gridHeight) {
        this.farmerPos.x = nx;
        this.farmerPos.y = ny;
        this.farmerDir = d.x >= 0 ? 1 : -1;
      }
    }

    const cs = this.cellSize;
    const cx = (this.farmerPos.x + 0.5) * cs;
    const cy = (this.farmerPos.y + 0.5) * cs;
    const walk = Math.sin(time * 4) * 0.08; // 走路摆动

    ctx.save();
    ctx.translate(cx, cy);
    ctx.scale(this.farmerDir, 1); // 面朝方向

    // 阴影
    ctx.fillStyle = 'rgba(0,0,0,0.15)';
    ctx.beginPath();
    ctx.ellipse(0, cs * 0.4, cs * 0.2, cs * 0.06, 0, 0, Math.PI * 2);
    ctx.fill();

    // 腿（走路摆动）
    ctx.fillStyle = '#5566aa';  // 蓝色裤子
    ctx.beginPath();
    ctx.roundRect(-cs * 0.08 - cs * 0.06, cs * 0.1, cs * 0.12, cs * 0.25 + Math.sin(time * 8) * cs * 0.03, 2);
    ctx.fill();
    ctx.beginPath();
    ctx.roundRect(cs * 0.08 - cs * 0.06, cs * 0.1, cs * 0.12, cs * 0.25 - Math.sin(time * 8) * cs * 0.03, 2);
    ctx.fill();

    // 鞋子
    ctx.fillStyle = '#553311';
    ctx.beginPath();
    ctx.roundRect(-cs * 0.1, cs * 0.32, cs * 0.12, cs * 0.06, 2);
    ctx.fill();
    ctx.beginPath();
    ctx.roundRect(cs * 0.02, cs * 0.32, cs * 0.12, cs * 0.06, 2);
    ctx.fill();

    // 身体（棕色工作服）
    ctx.fillStyle = '#8B6914';
    ctx.beginPath();
    ctx.roundRect(-cs * 0.15, -cs * 0.15, cs * 0.3, cs * 0.3, 4);
    ctx.fill();
    ctx.strokeStyle = '#6B4914';
    ctx.lineWidth = 1;
    ctx.stroke();

    // 吊带
    ctx.strokeStyle = '#6B4914';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(-cs * 0.1, -cs * 0.15);
    ctx.lineTo(-cs * 0.06, cs * 0.15);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(cs * 0.1, -cs * 0.15);
    ctx.lineTo(cs * 0.06, cs * 0.15);
    ctx.stroke();

    // 手臂（摆动）
    ctx.fillStyle = '#dda870';  // 肤色
    ctx.beginPath();
    ctx.roundRect(-cs * 0.22, -cs * 0.08 + Math.sin(time * 4) * cs * 0.03, cs * 0.08, cs * 0.2, 3);
    ctx.fill();
    ctx.beginPath();
    ctx.roundRect(cs * 0.14, -cs * 0.08 - Math.sin(time * 4) * cs * 0.03, cs * 0.08, cs * 0.2, 3);
    ctx.fill();

    // 头（圆形）
    ctx.fillStyle = '#dda870';
    ctx.beginPath();
    ctx.arc(0, -cs * 0.28, cs * 0.15, 0, Math.PI * 2);
    ctx.fill();

    // 草帽
    ctx.fillStyle = '#e8d44d';
    // 帽檐
    ctx.beginPath();
    ctx.ellipse(0, -cs * 0.33, cs * 0.22, cs * 0.06, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#c4a830';
    ctx.lineWidth = 1;
    ctx.stroke();
    // 帽顶
    ctx.fillStyle = '#e8d44d';
    ctx.beginPath();
    ctx.ellipse(0, -cs * 0.4, cs * 0.12, cs * 0.1, 0, 0, Math.PI * 2);
    ctx.fill();

    // 脸部
    // 眼睛
    ctx.fillStyle = '#222';
    ctx.beginPath(); ctx.arc(-cs * 0.05, -cs * 0.28, cs * 0.025, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(cs * 0.05, -cs * 0.28, cs * 0.025, 0, Math.PI * 2); ctx.fill();
    // 鼻子
    ctx.fillStyle = '#cc9966';
    ctx.beginPath(); ctx.arc(0, -cs * 0.24, cs * 0.02, 0, Math.PI * 2); ctx.fill();
    // 嘴
    ctx.strokeStyle = '#aa6633';
    ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.arc(0, -cs * 0.22, cs * 0.04, 0.2, Math.PI - 0.2); ctx.stroke();

    // 手里的锄头/叉子
    ctx.strokeStyle = '#8B5A2B';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(cs * 0.18, -cs * 0.05);
    ctx.lineTo(cs * 0.3, -cs * 0.4);
    ctx.stroke();
    // 叉头
    ctx.strokeStyle = '#888';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(cs * 0.25, -cs * 0.4);
    ctx.lineTo(cs * 0.35, -cs * 0.4);
    ctx.moveTo(cs * 0.27, -cs * 0.4);
    ctx.lineTo(cs * 0.27, -cs * 0.48);
    ctx.moveTo(cs * 0.33, -cs * 0.4);
    ctx.lineTo(cs * 0.33, -cs * 0.48);
    ctx.stroke();

    // 感叹号（蛇靠近时）
    ctx.restore();
  }

  hasFarmer(pos: Position): boolean {
    return pos.x === this.farmerPos.x && pos.y === this.farmerPos.y;
  }

  getFarmerPos(): Position {
    return { ...this.farmerPos };
  }
}
