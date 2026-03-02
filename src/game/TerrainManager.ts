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
  private riverPoints: RiverPoint[] = [];
  private riverGridCells: Set<string> = new Set();
  private crocodiles: Crocodile[] = [];
  private decorations: Decoration[] = [];
  private dirtTexture: Array<{ x: number; y: number; shade: number }> = [];
  private lastCrocSpawn: number = -5;  // 首只鳄鱼5秒后出现
  private currentTime: number = 0;
  
  // 农夫系统
  private farmerPos: Position;
  private farmerDir: number = 1;
  private farmerTimer: number = 0;

  // River bezier control points for rendering
  private riverCP: { p0: RiverPoint; p1: RiverPoint; p2: RiverPoint; p3: RiverPoint };

  constructor(config: GameConfig) {
    this.config = config;
    this.cellSize = config.cellSize;
    this.riverCP = { p0: { x: 0, y: 0 }, p1: { x: 0, y: 0 }, p2: { x: 0, y: 0 }, p3: { x: 0, y: 0 } };
    this.farmerPos = { x: Math.floor(config.gridWidth / 2), y: 0 };
    this.generate();
  }

  private generate(): void {
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
    const riverWidth = 2.5; // grid cells wide
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
    const count = 4 + Math.floor(Math.random() * 3); // 4-6条灌木带
    const gw = this.config.gridWidth;
    const gh = this.config.gridHeight;

    for (let i = 0; i < count; i++) {
      let gx: number, gy: number;
      let attempts = 0;
      do {
        gx = Math.floor(Math.random() * (gw - 2));
        gy = Math.floor(Math.random() * (gh - 2));
        attempts++;
      } while (this.isInRiver({ x: gx, y: gy }) && attempts < 20);

      // 长条形灌木：随机水平或垂直方向
      const isHorizontal = Math.random() > 0.5;
      const length = 3 + Math.floor(Math.random() * 3); // 3-5格长
      const w = isHorizontal ? length : 1;
      const h = isHorizontal ? 1 : length;

      // 确保不超出边界
      const finalW = Math.min(w, gw - gx);
      const finalH = Math.min(h, gh - gy);

      // 沿着长条方向排列椭圆形灌木丛
      const circles: Bush['circles'] = [];
      const greens = ['#1a8c0e', '#22aa15', '#158a08', '#2ebc1e', '#0d7a05'];
      const numCircles = (finalW + finalH) * 2 + 3; // 更多圆形填满长条

      for (let c = 0; c < numCircles; c++) {
        // 沿长条方向分布，有轻微随机偏移
        const along = (c / numCircles) - 0.5; // -0.5 to 0.5
        const cross = (Math.random() - 0.5) * 0.6;
        circles.push({
          ox: (isHorizontal ? along : cross) * finalW * this.cellSize,
          oy: (isHorizontal ? cross : along) * finalH * this.cellSize,
          r: this.cellSize * (0.4 + Math.random() * 0.35),
          color: greens[Math.floor(Math.random() * greens.length)],
        });
      }

      this.bushes.push({ gridX: gx, gridY: gy, width: finalW, height: finalH, circles });
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

  // ==================== Render ====================

  render(ctx: CanvasRenderingContext2D, time: number): void {
    this.currentTime = time;
    this.updateCrocodiles(time);
    this.renderDirtTexture(ctx);
    this.renderDecorations(ctx);
    this.renderRiver(ctx, time);
    // Bush bases (shadow) + full bushes rendered in base layer too
    this.renderBushBases(ctx);
    this.renderBushTops(ctx);  // 底层也画灌木，确保可见
    this.renderFarmer(ctx, time);
  }

  renderOverlay(ctx: CanvasRenderingContext2D, time: number): void {
    // Bush tops rendered on top of snake/animals for occlusion
    this.renderBushTops(ctx);
  }

  private renderDirtTexture(ctx: CanvasRenderingContext2D): void {
    // Dirt patches
    for (const patch of this.dirtTexture) {
      const alpha = Math.abs(patch.shade);
      ctx.fillStyle = patch.shade > 0
        ? `rgba(255,255,200,${alpha})`
        : `rgba(100,70,30,${alpha})`;
      ctx.beginPath();
      ctx.arc(patch.x, patch.y, 15 + Math.random() * 20, 0, Math.PI * 2);
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
    const riverWidth = 2.5 * cs;

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
    ctx.save();
    for (const bush of this.bushes) {
      const bx = bush.gridX * cs;
      const by = bush.gridY * cs;
      const bw = bush.width * cs;
      const bh = bush.height * cs;
      const centerX = bx + bw / 2;
      const centerY = by + bh / 2;

      // ===== 底部阴影 =====
      ctx.fillStyle = 'rgba(0,40,0,0.25)';
      ctx.beginPath();
      ctx.ellipse(centerX, centerY + bh * 0.15, bw * 0.55, bh * 0.35, 0, 0, Math.PI * 2);
      ctx.fill();

      // ===== 树干/根部（棕色底部） =====
      ctx.fillStyle = '#5a3a1a';
      const trunkCount = Math.max(2, Math.floor(bw / cs));
      for (let t = 0; t < trunkCount; t++) {
        const tx = bx + (t + 0.5) * (bw / trunkCount);
        ctx.beginPath();
        ctx.roundRect(tx - cs * 0.04, centerY + bh * 0.05, cs * 0.08, bh * 0.25, 2);
        ctx.fill();
      }

      // ===== 主体灌木叶（多层绿色，自然凹凸轮廓） =====
      // 用多个不同大小的弧形堆叠，模拟灌木丛顶部的凹凸不平
      const leafLayers = [
        { color: '#0d5a08', offsetY: 0.05 },    // 最底层深绿
        { color: '#158a0c', offsetY: 0 },         // 中层绿
        { color: '#1da012', offsetY: -0.05 },     // 上层亮绿
      ];

      for (const layer of leafLayers) {
        ctx.fillStyle = layer.color;
        ctx.beginPath();

        // 画自然的波浪形顶部轮廓
        const numBumps = Math.max(3, Math.floor(bw / cs) * 2 + 1);
        const startX = bx - cs * 0.1;
        const endX = bx + bw + cs * 0.1;

        // 底部直线
        ctx.moveTo(startX, centerY + bh * 0.2);

        // 顶部波浪形
        for (let b = 0; b <= numBumps; b++) {
          const t = b / numBumps;
          const px = startX + t * (endX - startX);
          // 每个bump高度随机，用sin+随机创造自然感
          const bumpHeight = bh * (0.3 + bush.circles[b % bush.circles.length].r / cs * 0.2);
          const py = centerY - bumpHeight + layer.offsetY * cs;
          
          if (b === 0) {
            ctx.lineTo(startX, py);
          } else {
            const cpx = startX + (t - 0.5 / numBumps) * (endX - startX);
            ctx.quadraticCurveTo(cpx, py - bh * 0.1, px, py);
          }
        }

        // 右侧和底部闭合
        ctx.lineTo(endX, centerY + bh * 0.2);
        ctx.closePath();
        ctx.fill();
      }

      // ===== 深色描边轮廓 =====
      ctx.strokeStyle = '#063d03';
      ctx.lineWidth = 2;
      ctx.beginPath();
      const numBumps = Math.max(3, Math.floor(bw / cs) * 2 + 1);
      const startX = bx - cs * 0.1;
      const endX = bx + bw + cs * 0.1;
      ctx.moveTo(startX, centerY + bh * 0.2);
      for (let b = 0; b <= numBumps; b++) {
        const t = b / numBumps;
        const px = startX + t * (endX - startX);
        const bumpHeight = bh * (0.3 + bush.circles[b % bush.circles.length].r / cs * 0.2);
        const py = centerY - bumpHeight - 0.05 * cs;
        if (b === 0) {
          ctx.lineTo(startX, py);
        } else {
          const cpx = startX + (t - 0.5 / numBumps) * (endX - startX);
          ctx.quadraticCurveTo(cpx, py - bh * 0.1, px, py);
        }
      }
      ctx.lineTo(endX, centerY + bh * 0.2);
      ctx.closePath();
      ctx.stroke();

      // ===== 叶片细节（小椭圆散布在表面） =====
      const leafColors = ['#22bb18', '#2ecc1e', '#18aa0d', '#35dd28'];
      for (let j = 0; j < bw / cs * 5; j++) {
        ctx.fillStyle = leafColors[j % leafColors.length];
        const lx = bx + Math.random() * bw;
        const ly = centerY - bh * 0.15 + (Math.random() - 0.5) * bh * 0.4;
        const angle = Math.random() * Math.PI;
        ctx.beginPath();
        ctx.ellipse(lx, ly, cs * 0.1, cs * 0.05, angle, 0, Math.PI * 2);
        ctx.fill();
      }

      // ===== 高光反射 =====
      ctx.fillStyle = 'rgba(180,255,150,0.15)';
      ctx.beginPath();
      ctx.ellipse(centerX - bw * 0.1, centerY - bh * 0.2, bw * 0.35, bh * 0.15, -0.2, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  private updateCrocodiles(time: number): void {
    // Remove expired crocs
    this.crocodiles = this.crocodiles.filter(c => time - c.spawnTime < c.duration);

    // Spawn new croc every 10 seconds
    if (time - this.lastCrocSpawn >= 6) {  // 每6秒出现一只鳄鱼
      this.lastCrocSpawn = time;
      // Pick random river cell
      const riverCells = Array.from(this.riverGridCells).map(s => {
        const [x, y] = s.split(',').map(Number);
        return { x, y };
      });
      if (riverCells.length > 0) {
        const cell = riverCells[Math.floor(Math.random() * riverCells.length)];
        this.crocodiles.push({
          gridX: cell.x,
          gridY: cell.y,
          spawnTime: time,
          duration: 3,
        });
      }
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
