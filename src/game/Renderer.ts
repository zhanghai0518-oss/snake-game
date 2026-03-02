import { Snake, Direction, Position } from './Snake';
import { Food } from './Food';
import { Animal, AnimalType } from './AnimalManager';
import { Buff, BuffType } from './BuffSystem';
import { GameConfig } from '../config/GameConfig';
import { GameState } from './Game';
import { ParticleSystem } from './ParticleSystem';

/**
 * 贪吃蛇·动物大战 - 卡通风格视觉渲染器
 */
export class Renderer {
  private ctx: CanvasRenderingContext2D;
  private config: GameConfig;
  private cellSize: number;

  // 动画状态
  private time: number = 0;
  private tonguePhase: number = 0;
  private swallowIndex: number = -1;
  private swallowTimer: number = 0;
  private hurtTimer: number = 0;
  private hurtFlashCount: number = 0;

  // Combo UI
  private comboCount: number = 0;
  private comboTimer: number = 0;
  private comboScale: number = 1;

  // Boss 警告
  private bossWarningTimer: number = 0;

  // 粒子系统
  readonly particles: ParticleSystem = new ParticleSystem();

  // 背景装饰（随机花草位置，每次创建时生成）
  private decorations: Array<{ x: number; y: number; type: 'flower' | 'grass' | 'clover'; color: string }> = [];

  constructor(ctx: CanvasRenderingContext2D, config: GameConfig) {
    this.ctx = ctx;
    this.config = config;
    this.cellSize = Math.min(
      ctx.canvas.width / config.gridWidth,
      ctx.canvas.height / config.gridHeight
    );
    this.generateDecorations();
  }

  private generateDecorations(): void {
    const count = 15 + Math.floor(Math.random() * 10);
    const colors = ['#ffee55', '#ff99aa', '#ffffff', '#ff6699', '#ffcc44'];
    for (let i = 0; i < count; i++) {
      this.decorations.push({
        x: Math.random() * this.config.gridWidth * this.cellSize,
        y: Math.random() * this.config.gridHeight * this.cellSize,
        type: (['flower', 'grass', 'clover'] as const)[Math.floor(Math.random() * 3)],
        color: colors[Math.floor(Math.random() * colors.length)],
      });
    }
  }

  /** 每帧调用，更新动画计时器 */
  tick(dt: number): void {
    this.time += dt;
    this.tonguePhase += dt * 4;
    if (this.swallowTimer > 0) {
      this.swallowTimer -= dt;
      if (this.swallowTimer <= 0) this.swallowIndex = -1;
    }
    if (this.hurtTimer > 0) {
      this.hurtTimer -= dt;
    }
    if (this.comboTimer > 0) {
      this.comboTimer -= dt;
      const t = 1 - this.comboTimer / 1.5;
      this.comboScale = t < 0.2 ? 1 + t * 5 : 1 + (1 - t) * 0.3;
    }
    if (this.bossWarningTimer > 0) {
      this.bossWarningTimer -= dt;
    }
    this.particles.update(dt);
  }

  triggerEat(): void {
    this.swallowIndex = 0;
    this.swallowTimer = 0.8;  // 更长的吞咽时间，效果更明显
  }

  triggerHurt(): void {
    this.hurtTimer = 0.6;
    this.hurtFlashCount = 3;
  }

  triggerCombo(count: number): void {
    this.comboCount = count;
    this.comboTimer = 1.5;
    this.comboScale = 2;
  }

  triggerBossWarning(): void {
    this.bossWarningTimer = 2.0;
  }

  // ===================== 清屏与背景 =====================

  clear(): void {
    const ctx = this.ctx;
    const w = ctx.canvas.width;
    const h = ctx.canvas.height;

    // 草地绿色渐变背景
    const grad = ctx.createLinearGradient(0, 0, 0, h);
    grad.addColorStop(0, '#4a8c3f');
    grad.addColorStop(0.5, '#3d7a35');
    grad.addColorStop(1, '#357030');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);

    // 画背景装饰（小花小草）
    this.drawDecorations(ctx);
  }

  private drawDecorations(ctx: CanvasRenderingContext2D): void {
    ctx.save();
    for (const d of this.decorations) {
      if (d.type === 'flower') {
        // 小花：5片花瓣 + 花心
        const r = 3;
        ctx.fillStyle = d.color;
        for (let i = 0; i < 5; i++) {
          const a = (i / 5) * Math.PI * 2 + this.time * 0.1;
          ctx.beginPath();
          ctx.arc(d.x + Math.cos(a) * r, d.y + Math.sin(a) * r, 2.5, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.fillStyle = '#ffaa00';
        ctx.beginPath();
        ctx.arc(d.x, d.y, 2, 0, Math.PI * 2);
        ctx.fill();
      } else if (d.type === 'grass') {
        // 小草：几根弯曲线条
        ctx.strokeStyle = '#5aad4a';
        ctx.lineWidth = 1.5;
        ctx.lineCap = 'round';
        for (let i = -1; i <= 1; i++) {
          ctx.beginPath();
          ctx.moveTo(d.x + i * 2, d.y);
          ctx.quadraticCurveTo(d.x + i * 4, d.y - 8, d.x + i * 3, d.y - 12);
          ctx.stroke();
        }
      } else {
        // 三叶草
        ctx.fillStyle = '#66bb55';
        for (let i = 0; i < 3; i++) {
          const a = (i / 3) * Math.PI * 2 - Math.PI / 2;
          ctx.beginPath();
          ctx.arc(d.x + Math.cos(a) * 3, d.y + Math.sin(a) * 3, 3, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }
    ctx.restore();
  }

  drawGrid(): void {
    const ctx = this.ctx;
    const gw = this.config.gridWidth * this.cellSize;
    const gh = this.config.gridHeight * this.cellSize;

    // 淡绿半透明网格线
    ctx.strokeStyle = 'rgba(100, 180, 80, 0.15)';
    ctx.lineWidth = 0.5;
    for (let x = 0; x <= this.config.gridWidth; x++) {
      ctx.beginPath();
      ctx.moveTo(x * this.cellSize, 0);
      ctx.lineTo(x * this.cellSize, gh);
      ctx.stroke();
    }
    for (let y = 0; y <= this.config.gridHeight; y++) {
      ctx.beginPath();
      ctx.moveTo(0, y * this.cellSize);
      ctx.lineTo(gw, y * this.cellSize);
      ctx.stroke();
    }

    // 木栅栏边框
    this.drawFence(ctx, gw, gh);
  }

  private drawFence(ctx: CanvasRenderingContext2D, gw: number, gh: number): void {
    const t = 6; // 栅栏厚度
    // 棕色渐变
    const fenceColor1 = '#8B5E3C';
    const fenceColor2 = '#6B3F1F';
    const fenceHighlight = '#A07050';

    // 四边
    const sides: Array<[number, number, number, number]> = [
      [0, -t, gw, t],       // top
      [0, gh, gw, t],       // bottom
      [-t, 0, t, gh],       // left
      [gw, 0, t, gh],       // right
    ];

    for (const [x, y, w, h] of sides) {
      const g = ctx.createLinearGradient(x, y, x + (w > h ? 0 : w), y + (w > h ? h : 0));
      g.addColorStop(0, fenceHighlight);
      g.addColorStop(0.5, fenceColor1);
      g.addColorStop(1, fenceColor2);
      ctx.fillStyle = g;
      ctx.fillRect(x, y, w, h);
    }

    // 角落装饰
    ctx.fillStyle = fenceColor2;
    ctx.fillRect(-t, -t, t, t);
    ctx.fillRect(gw, -t, t, t);
    ctx.fillRect(-t, gh, t, t);
    ctx.fillRect(gw, gh, t, t);

    // 栅栏竖条纹理（上下边）
    ctx.strokeStyle = 'rgba(0,0,0,0.2)';
    ctx.lineWidth = 1;
    const postSpacing = this.cellSize;
    for (let x = 0; x < gw; x += postSpacing) {
      // 顶边
      ctx.beginPath(); ctx.moveTo(x, -t); ctx.lineTo(x, 0); ctx.stroke();
      // 底边
      ctx.beginPath(); ctx.moveTo(x, gh); ctx.lineTo(x, gh + t); ctx.stroke();
    }
    for (let y = 0; y < gh; y += postSpacing) {
      ctx.beginPath(); ctx.moveTo(-t, y); ctx.lineTo(0, y); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(gw, y); ctx.lineTo(gw + t, y); ctx.stroke();
    }
  }

  // ===================== 蛇的渲染 =====================

  drawSnake(snake: Snake): void {
    const ctx = this.ctx;
    const body = snake.body;
    const cs = this.cellSize;

    if (body.length === 0) return;

    const dir = this.getSnakeDirection(body);

    let shakeX = 0, shakeY = 0;
    const isHurt = this.hurtTimer > 0;
    if (isHurt) {
      shakeX = (Math.random() - 0.5) * 4;
      shakeY = (Math.random() - 0.5) * 4;
    }

    ctx.save();
    ctx.translate(shakeX, shakeY);

    // 画蛇身（从尾到头）
    for (let i = body.length - 1; i >= 1; i--) {
      const seg = body[i];
      const cx = (seg.x + 0.5) * cs;
      const cy = (seg.y + 0.5) * cs;

      const swallowWavePos = this.swallowTimer > 0 ? Math.floor((0.8 - this.swallowTimer) / 0.8 * body.length) : -1;
      const isSwallow = this.swallowTimer > 0 && i > 0 && Math.abs(i - swallowWavePos) <= 1;
      const bulge = isSwallow ? 1.5 : 1.0;  // 鼓起1.5倍更明显

      // 尾巴逐渐变小
      const tailRatio = i / body.length;
      const sizeFactor = 0.6 + 0.4 * (1 - tailRatio); // 头部附近1.0, 尾部0.6
      const radius = cs * 0.38 * bulge * sizeFactor;

      const flashRed = isHurt && Math.floor(this.hurtTimer * 10) % 2 === 0;

      // 黄色主体 + 橙色条纹
      const baseColor = flashRed ? '#ff4444' : '#FFD700';
      const stripeColor = flashRed ? '#cc2222' : '#FF8C00';

      // 圆形身体段
      ctx.fillStyle = baseColor;
      ctx.beginPath();
      ctx.arc(cx, cy, radius, 0, Math.PI * 2);
      ctx.fill();

      // 橙色条纹（偶数段）
      if (i % 2 === 0) {
        ctx.fillStyle = stripeColor;
        ctx.beginPath();
        ctx.arc(cx, cy, radius * 0.7, 0, Math.PI * 2);
        ctx.fill();
        // 内部再画一个主色小圆，形成环状条纹
        ctx.fillStyle = baseColor;
        ctx.beginPath();
        ctx.arc(cx, cy, radius * 0.4, 0, Math.PI * 2);
        ctx.fill();
      }

      // 高光
      ctx.fillStyle = 'rgba(255,255,255,0.25)';
      ctx.beginPath();
      ctx.arc(cx - radius * 0.2, cy - radius * 0.2, radius * 0.35, 0, Math.PI * 2);
      ctx.fill();
    }

    // 蛇头
    this.drawSnakeHead(ctx, body[0], dir, isHurt);

    ctx.restore();
  }

  private drawSnakeHead(
    ctx: CanvasRenderingContext2D,
    head: Position,
    dir: Direction,
    isHurt: boolean
  ): void {
    const cs = this.cellSize;
    const cx = (head.x + 0.5) * cs;
    const cy = (head.y + 0.5) * cs;

    const flashRed = isHurt && Math.floor(this.hurtTimer * 10) % 2 === 0;
    const isEating = this.swallowTimer > 0.2;

    let angle = 0;
    switch (dir) {
      case Direction.RIGHT: angle = 0; break;
      case Direction.DOWN: angle = Math.PI / 2; break;
      case Direction.LEFT: angle = Math.PI; break;
      case Direction.UP: angle = -Math.PI / 2; break;
    }

    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(angle);

    const headW = cs * 0.6;
    const headH = cs * 0.5;
    const headColor = flashRed ? '#ff4444' : '#FFD700';

    // 张嘴角度：平时就张大嘴（凶猛），吃东西时张得更大
    const jawOpen = isEating ? headH * 0.7 : headH * 0.45;

    // === 上颚 ===
    ctx.fillStyle = headColor;
    ctx.beginPath();
    ctx.moveTo(headW * 1.15, -jawOpen * 0.1);           // 嘴尖上
    ctx.quadraticCurveTo(headW * 0.5, -headH * 0.9, -headW * 0.6, -headH * 0.7);  // 头顶弧线
    ctx.lineTo(-headW * 0.5, 0);                          // 后颈
    ctx.lineTo(headW * 0.3, 0);                            // 下缘
    ctx.closePath();
    ctx.fill();

    // === 下颚 ===
    ctx.fillStyle = flashRed ? '#dd2222' : '#E8C200';
    ctx.beginPath();
    ctx.moveTo(headW * 1.15, jawOpen * 0.1);              // 嘴尖下
    ctx.quadraticCurveTo(headW * 0.5, headH * 0.9, -headW * 0.6, headH * 0.7);
    ctx.lineTo(-headW * 0.5, 0);
    ctx.lineTo(headW * 0.3, 0);
    ctx.closePath();
    ctx.fill();

    // === 嘴巴内部（红色口腔，一直可见） ===
    ctx.fillStyle = isEating ? '#cc2222' : '#aa3333';
    ctx.beginPath();
    ctx.ellipse(headW * 0.55, 0, headW * 0.45, jawOpen * 0.6, 0, 0, Math.PI * 2);
    ctx.fill();

    // 嘴巴深处
    ctx.fillStyle = '#661111';
    ctx.beginPath();
    ctx.ellipse(headW * 0.35, 0, headW * 0.2, jawOpen * 0.3, 0, 0, Math.PI * 2);
    ctx.fill();

    // === 尖牙（上下各2颗） ===
    ctx.fillStyle = '#ffffff';
    // 上牙
    ctx.beginPath();
    ctx.moveTo(headW * 0.75, -jawOpen * 0.05);
    ctx.lineTo(headW * 0.65, jawOpen * 0.25);
    ctx.lineTo(headW * 0.55, -jawOpen * 0.05);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(headW * 0.45, -jawOpen * 0.03);
    ctx.lineTo(headW * 0.38, jawOpen * 0.18);
    ctx.lineTo(headW * 0.3, -jawOpen * 0.03);
    ctx.fill();
    // 下牙
    ctx.beginPath();
    ctx.moveTo(headW * 0.75, jawOpen * 0.05);
    ctx.lineTo(headW * 0.65, -jawOpen * 0.2);
    ctx.lineTo(headW * 0.55, jawOpen * 0.05);
    ctx.fill();

    // 头部高光
    ctx.fillStyle = 'rgba(255,255,255,0.25)';
    ctx.beginPath();
    ctx.ellipse(-headW * 0.05, -headH * 0.35, headW * 0.4, headH * 0.2, -0.3, 0, Math.PI * 2);
    ctx.fill();

    // === 凶猛的眼睛（竖瞳+锐利眼型） ===
    const eyeX = headW * 0.05;
    const eyeY = headH * 0.55;
    const eyeR = cs * 0.14;

    for (const ey of [-eyeY, eyeY]) {
      // 黄色虹膜
      ctx.fillStyle = flashRed ? '#ff6666' : '#ffee00';
      ctx.beginPath();
      ctx.arc(eyeX, ey, eyeR, 0, Math.PI * 2);
      ctx.fill();
      // 黑色眼框
      ctx.strokeStyle = '#333';
      ctx.lineWidth = 1.5;
      ctx.stroke();
      // 竖瞳（像真蛇）
      ctx.fillStyle = '#111111';
      ctx.beginPath();
      ctx.ellipse(eyeX, ey, eyeR * 0.25, eyeR * 0.85, 0, 0, Math.PI * 2);
      ctx.fill();
      // 高光
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(eyeX + eyeR * 0.3, ey - eyeR * 0.3, eyeR * 0.2, 0, Math.PI * 2);
      ctx.fill();
    }

    // === 舌头（从大嘴中伸出） ===
    const tongueLen = cs * 0.5 * (0.5 + 0.5 * Math.sin(this.tonguePhase));
    const tongueStart = headW * 1.05;
    ctx.strokeStyle = '#ff2222';
    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(tongueStart, 0);
    ctx.lineTo(tongueStart + tongueLen * 0.6, 0);
    ctx.lineTo(tongueStart + tongueLen, -cs * 0.12);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(tongueStart + tongueLen * 0.6, 0);
    ctx.lineTo(tongueStart + tongueLen, cs * 0.12);
    ctx.stroke();

    ctx.restore();  }

  private getSnakeDirection(body: Position[]): Direction {
    if (body.length < 2) return Direction.RIGHT;
    const head = body[0];
    const neck = body[1];
    const dx = head.x - neck.x;
    const dy = head.y - neck.y;
    if (dx > 0 || dx < -1) return Direction.RIGHT;
    if (dx < 0 || dx > 1) return Direction.LEFT;
    if (dy > 0 || dy < -1) return Direction.DOWN;
    if (dy < 0 || dy > 1) return Direction.UP;
    return Direction.RIGHT;
  }

  // ===================== 食物 =====================

  drawFood(food: Food): void {
    const ctx = this.ctx;
    const x = (food.position.x + 0.5) * this.cellSize;
    const y = (food.position.y + 0.5) * this.cellSize;
    const floatY = Math.sin(this.time * 3 + food.position.x) * 2;

    ctx.shadowColor = food.color;
    ctx.shadowBlur = 12 + Math.sin(this.time * 5) * 4;

    ctx.font = `${this.cellSize * 0.8}px Arial`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(food.emoji, x, y + floatY);

    ctx.shadowBlur = 0;
  }

  // ===================== 动物 =====================

  drawAnimal(animal: Animal): void {
    const ctx = this.ctx;
    const cs = this.cellSize;
    const x = (animal.position.x + 0.5) * cs;
    const y = (animal.position.y + 0.5) * cs;
    const t = this.time;

    ctx.save();

    if (animal.frozen) {
      ctx.globalAlpha = 0.5;
    }
    if (animal.def.type === AnimalType.POISON_FROG) {
      ctx.globalAlpha = animal.flashOn ? 1.0 : 0.3;
    }

    switch (animal.def.type) {
      case AnimalType.MOUSE: this.drawMouse(ctx, x, y, cs, t); break;
      case AnimalType.FROG: this.drawFrog(ctx, x, y, cs, t); break;
      case AnimalType.RABBIT: this.drawRabbit(ctx, x, y, cs, t); break;
      case AnimalType.SNAKE_EGG: this.drawSnakeEgg(ctx, x, y, cs, t); break;
      case AnimalType.BIRD_EGG: this.drawBirdEgg(ctx, x, y, cs, t); break;
      case AnimalType.EAGLE: this.drawEagle(ctx, x, y, cs, t); break;
      case AnimalType.HEDGEHOG: this.drawHedgehog(ctx, x, y, cs, t); break;
      case AnimalType.POISON_FROG: this.drawPoisonFrog(ctx, x, y, cs, t); break;
      case AnimalType.DIAMOND: this.drawDiamond(ctx, x, y, cs, t); break;
      case AnimalType.MAGNET: this.drawMagnet(ctx, x, y, cs, t); break;
      case AnimalType.ICE: this.drawIce(ctx, x, y, cs, t); break;
      case AnimalType.FIRE: this.drawFire(ctx, x, y, cs, t); break;
      case AnimalType.GHOST: this.drawGhost(ctx, x, y, cs, t); break;
    }

    ctx.restore();
  }

  private drawMouse(ctx: CanvasRenderingContext2D, x: number, y: number, cs: number, t: number): void {
    const shake = Math.sin(t * 15) * 0.5; // 偶尔抖动
    const mx = x + shake;
    const r = cs * 0.3;
    // 灰色身体
    ctx.fillStyle = '#999';
    ctx.beginPath();
    ctx.ellipse(mx, y, r, r * 0.8, 0, 0, Math.PI * 2);
    ctx.fill();
    // 大圆耳朵
    ctx.fillStyle = '#bbb';
    ctx.beginPath(); ctx.arc(mx - r * 0.6, y - r * 0.7, r * 0.45, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(mx + r * 0.6, y - r * 0.7, r * 0.45, 0, Math.PI * 2); ctx.fill();
    // 耳朵内部粉色
    ctx.fillStyle = '#eaa';
    ctx.beginPath(); ctx.arc(mx - r * 0.6, y - r * 0.7, r * 0.25, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(mx + r * 0.6, y - r * 0.7, r * 0.25, 0, Math.PI * 2); ctx.fill();
    // 眼睛
    ctx.fillStyle = '#222';
    ctx.beginPath(); ctx.arc(mx - r * 0.25, y - r * 0.1, 2, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(mx + r * 0.25, y - r * 0.1, 2, 0, Math.PI * 2); ctx.fill();
    // 鼻子
    ctx.fillStyle = '#e88';
    ctx.beginPath(); ctx.arc(mx, y + r * 0.15, 2, 0, Math.PI * 2); ctx.fill();
    // 尾巴
    ctx.strokeStyle = '#aaa';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(mx, y + r * 0.6);
    ctx.quadraticCurveTo(mx + r, y + r * 1.2, mx + r * 0.5, y + r * 1.5);
    ctx.stroke();
  }

  private drawFrog(ctx: CanvasRenderingContext2D, x: number, y: number, cs: number, t: number): void {
    const bounce = Math.abs(Math.sin(t * 4)) * 3;
    const squash = 1 + Math.sin(t * 4) * 0.1;
    const r = cs * 0.32;
    // 绿色身体
    ctx.fillStyle = '#44bb44';
    ctx.beginPath();
    ctx.ellipse(x, y - bounce, r * squash, r / squash, 0, 0, Math.PI * 2);
    ctx.fill();
    // 大鼓眼
    const ey = y - bounce - r * 0.7;
    ctx.fillStyle = '#ffffff';
    ctx.beginPath(); ctx.arc(x - r * 0.45, ey, r * 0.35, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(x + r * 0.45, ey, r * 0.35, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#222';
    ctx.beginPath(); ctx.arc(x - r * 0.45, ey, r * 0.18, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(x + r * 0.45, ey, r * 0.18, 0, Math.PI * 2); ctx.fill();
    // 红腮帮
    ctx.fillStyle = 'rgba(255,100,100,0.4)';
    ctx.beginPath(); ctx.arc(x - r * 0.7, y - bounce + r * 0.1, r * 0.2, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(x + r * 0.7, y - bounce + r * 0.1, r * 0.2, 0, Math.PI * 2); ctx.fill();
    // 微笑
    ctx.strokeStyle = '#228822';
    ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.arc(x, y - bounce + r * 0.1, r * 0.35, 0.2, Math.PI - 0.2); ctx.stroke();
  }

  private drawRabbit(ctx: CanvasRenderingContext2D, x: number, y: number, cs: number, t: number): void {
    const r = cs * 0.3;
    const earWave = Math.sin(t * 3) * 0.15;
    // 白色身体
    ctx.fillStyle = '#fff';
    ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
    // 长耳朵
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.ellipse(x - r * 0.35, y - r * 1.5, r * 0.2, r * 0.65, earWave - 0.1, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(x + r * 0.35, y - r * 1.5, r * 0.2, r * 0.65, -earWave + 0.1, 0, Math.PI * 2);
    ctx.fill();
    // 耳朵内粉色
    ctx.fillStyle = '#ffaaaa';
    ctx.beginPath();
    ctx.ellipse(x - r * 0.35, y - r * 1.5, r * 0.1, r * 0.45, earWave - 0.1, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(x + r * 0.35, y - r * 1.5, r * 0.1, r * 0.45, -earWave + 0.1, 0, Math.PI * 2);
    ctx.fill();
    // 眼睛
    ctx.fillStyle = '#ff4466';
    ctx.beginPath(); ctx.arc(x - r * 0.25, y - r * 0.15, 2.5, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(x + r * 0.25, y - r * 0.15, 2.5, 0, Math.PI * 2); ctx.fill();
    // 粉色鼻子
    ctx.fillStyle = '#ff8899';
    ctx.beginPath(); ctx.arc(x, y + r * 0.1, 2.5, 0, Math.PI * 2); ctx.fill();
    // 短尾巴
    ctx.fillStyle = '#eee';
    ctx.beginPath(); ctx.arc(x, y + r * 0.95, r * 0.2, 0, Math.PI * 2); ctx.fill();
  }

  private drawSnakeEgg(ctx: CanvasRenderingContext2D, x: number, y: number, cs: number, t: number): void {
    const wobble = Math.sin(t * 2 + x) * 0.05;
    const r = cs * 0.3;
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(wobble);
    // 白色蛋
    ctx.fillStyle = '#fffde8';
    ctx.beginPath(); ctx.ellipse(0, 0, r * 0.7, r, 0, 0, Math.PI * 2); ctx.fill();
    // 浅色斑点
    ctx.fillStyle = 'rgba(200,180,150,0.4)';
    ctx.beginPath(); ctx.arc(-r * 0.2, -r * 0.3, 2.5, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(r * 0.15, r * 0.2, 2, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(r * 0.1, -r * 0.1, 1.5, 0, Math.PI * 2); ctx.fill();
    // 高光
    ctx.fillStyle = 'rgba(255,255,255,0.5)';
    ctx.beginPath(); ctx.ellipse(-r * 0.15, -r * 0.35, r * 0.2, r * 0.15, -0.3, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  }

  private drawBirdEgg(ctx: CanvasRenderingContext2D, x: number, y: number, cs: number, _t: number): void {
    const r = cs * 0.3;
    // 草窝底座
    ctx.fillStyle = '#8B6914';
    ctx.beginPath();
    ctx.ellipse(x, y + r * 0.6, r * 1.0, r * 0.35, 0, 0, Math.PI * 2);
    ctx.fill();
    // 草丝
    ctx.strokeStyle = '#9a7b2e';
    ctx.lineWidth = 1;
    for (let i = -3; i <= 3; i++) {
      ctx.beginPath();
      ctx.moveTo(x + i * r * 0.25, y + r * 0.5);
      ctx.quadraticCurveTo(x + i * r * 0.35, y + r * 0.2, x + i * r * 0.2, y + r * 0.9);
      ctx.stroke();
    }
    // 蓝色蛋
    ctx.fillStyle = '#88ccee';
    ctx.beginPath(); ctx.ellipse(x, y - r * 0.1, r * 0.6, r * 0.85, 0, 0, Math.PI * 2); ctx.fill();
    // 深色斑点
    ctx.fillStyle = 'rgba(50,80,100,0.5)';
    ctx.beginPath(); ctx.arc(x - r * 0.15, y - r * 0.3, 2.5, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(x + r * 0.2, y, 2, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(x - r * 0.05, y + r * 0.25, 1.5, 0, Math.PI * 2); ctx.fill();
  }

  private drawEagle(ctx: CanvasRenderingContext2D, x: number, y: number, cs: number, t: number): void {
    const r = cs * 0.3;
    const wingAngle = Math.sin(t * 6) * 0.4;
    // 身体
    ctx.fillStyle = '#5a3a1a';
    ctx.beginPath(); ctx.ellipse(x, y, r * 0.6, r * 0.8, 0, 0, Math.PI * 2); ctx.fill();
    // 翅膀（扇动）
    ctx.fillStyle = '#4a2a10';
    ctx.save(); ctx.translate(x - r * 0.5, y - r * 0.2); ctx.rotate(-wingAngle - 0.3);
    ctx.beginPath(); ctx.ellipse(0, 0, r * 1.2, r * 0.3, -0.3, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
    ctx.save(); ctx.translate(x + r * 0.5, y - r * 0.2); ctx.rotate(wingAngle + 0.3);
    ctx.beginPath(); ctx.ellipse(0, 0, r * 1.2, r * 0.3, 0.3, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
    // 头
    ctx.fillStyle = '#fff';
    ctx.beginPath(); ctx.arc(x, y - r * 0.65, r * 0.4, 0, Math.PI * 2); ctx.fill();
    // 锐利眼睛
    ctx.fillStyle = '#ff8800';
    ctx.beginPath(); ctx.arc(x - r * 0.15, y - r * 0.7, 2.5, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(x + r * 0.15, y - r * 0.7, 2.5, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#111';
    ctx.beginPath(); ctx.arc(x - r * 0.15, y - r * 0.7, 1.2, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(x + r * 0.15, y - r * 0.7, 1.2, 0, Math.PI * 2); ctx.fill();
    // 弯钩嘴
    ctx.fillStyle = '#ff9900';
    ctx.beginPath();
    ctx.moveTo(x, y - r * 0.45);
    ctx.lineTo(x + r * 0.15, y - r * 0.3);
    ctx.lineTo(x, y - r * 0.15);
    ctx.lineTo(x - r * 0.15, y - r * 0.3);
    ctx.closePath(); ctx.fill();
  }

  private drawHedgehog(ctx: CanvasRenderingContext2D, x: number, y: number, cs: number, _t: number): void {
    const r = cs * 0.32;
    // 尖刺
    ctx.fillStyle = '#6b4226';
    for (let i = 0; i < 8; i++) {
      const a = Math.PI + (i / 7) * Math.PI;
      ctx.beginPath();
      ctx.moveTo(x + Math.cos(a) * r * 0.5, y + Math.sin(a) * r * 0.4 - r * 0.1);
      ctx.lineTo(x + Math.cos(a - 0.15) * r * 1.2, y + Math.sin(a - 0.15) * r * 1.0 - r * 0.1);
      ctx.lineTo(x + Math.cos(a + 0.15) * r * 0.6, y + Math.sin(a + 0.15) * r * 0.5 - r * 0.1);
      ctx.closePath(); ctx.fill();
    }
    // 棕色半圆身体
    ctx.fillStyle = '#c4915e';
    ctx.beginPath(); ctx.arc(x, y, r * 0.55, 0, Math.PI); ctx.fill();
    // 脸
    ctx.fillStyle = '#e8c89a';
    ctx.beginPath(); ctx.arc(x, y + r * 0.1, r * 0.4, 0, Math.PI * 2); ctx.fill();
    // 小眼
    ctx.fillStyle = '#222';
    ctx.beginPath(); ctx.arc(x - r * 0.15, y, 2, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(x + r * 0.15, y, 2, 0, Math.PI * 2); ctx.fill();
    // 小鼻子
    ctx.fillStyle = '#333';
    ctx.beginPath(); ctx.arc(x, y + r * 0.2, 2.5, 0, Math.PI * 2); ctx.fill();
  }

  private drawPoisonFrog(ctx: CanvasRenderingContext2D, x: number, y: number, cs: number, t: number): void {
    const r = cs * 0.32;
    // 紫色身体
    ctx.fillStyle = '#8833aa';
    ctx.beginPath(); ctx.ellipse(x, y, r, r * 0.8, 0, 0, Math.PI * 2); ctx.fill();
    // 红色警告斑点
    ctx.fillStyle = '#ff2244';
    const spots = [[-0.3, -0.2], [0.25, 0.1], [-0.1, 0.3], [0.3, -0.3]];
    for (const [sx, sy] of spots) {
      ctx.beginPath(); ctx.arc(x + r * sx, y + r * sy, 2.5, 0, Math.PI * 2); ctx.fill();
    }
    // 大鼓眼
    const ey = y - r * 0.6;
    ctx.fillStyle = '#ffff44';
    ctx.beginPath(); ctx.arc(x - r * 0.4, ey, r * 0.3, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(x + r * 0.4, ey, r * 0.3, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#111';
    ctx.beginPath(); ctx.arc(x - r * 0.4, ey, r * 0.15, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(x + r * 0.4, ey, r * 0.15, 0, Math.PI * 2); ctx.fill();
    // 毒气泡
    ctx.fillStyle = 'rgba(170, 0, 255, 0.3)';
    const bubbleY = y - r * 1.2 - Math.abs(Math.sin(t * 3)) * cs * 0.3;
    ctx.beginPath(); ctx.arc(x + r * 0.3, bubbleY, 3 + Math.sin(t * 2), 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(x - r * 0.2, bubbleY - 5, 2, 0, Math.PI * 2); ctx.fill();
  }

  private drawDiamond(ctx: CanvasRenderingContext2D, x: number, y: number, cs: number, t: number): void {
    const r = cs * 0.35;
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(t * 2);
    // 多面体钻石
    const grad = ctx.createLinearGradient(-r, -r, r, r);
    grad.addColorStop(0, '#88ddff');
    grad.addColorStop(0.5, '#ffffff');
    grad.addColorStop(1, '#44aaff');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.moveTo(0, -r);
    ctx.lineTo(r * 0.7, -r * 0.3);
    ctx.lineTo(r * 0.5, r * 0.7);
    ctx.lineTo(-r * 0.5, r * 0.7);
    ctx.lineTo(-r * 0.7, -r * 0.3);
    ctx.closePath(); ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.6)';
    ctx.lineWidth = 1;
    ctx.stroke();
    // 内部线条
    ctx.beginPath();
    ctx.moveTo(-r * 0.35, -r * 0.3);
    ctx.lineTo(0, r * 0.7);
    ctx.lineTo(r * 0.35, -r * 0.3);
    ctx.strokeStyle = 'rgba(255,255,255,0.3)';
    ctx.stroke();
    ctx.restore();
    // 闪光
    const sparkle = Math.sin(t * 5) * 0.5 + 0.5;
    ctx.fillStyle = `rgba(255,255,255,${sparkle * 0.6})`;
    ctx.beginPath(); ctx.arc(x - r * 0.3, y - r * 0.4, 3, 0, Math.PI * 2); ctx.fill();
  }

  private drawMagnet(ctx: CanvasRenderingContext2D, x: number, y: number, cs: number, t: number): void {
    const r = cs * 0.3;
    const pulse = Math.sin(t * 4) * 0.1;
    ctx.save(); ctx.translate(x, y); ctx.rotate(Math.sin(t * 2) * 0.15);
    // U形磁铁
    ctx.strokeStyle = '#cc2222';
    ctx.lineWidth = r * 0.45;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.arc(0, -r * 0.1, r * (0.55 + pulse), 0, Math.PI);
    ctx.stroke();
    // 蓝红端
    ctx.fillStyle = '#cc2222';
    ctx.fillRect(-r * 0.8, -r * 0.1, r * 0.45, r * 0.5);
    ctx.fillStyle = '#2244cc';
    ctx.fillRect(r * 0.35, -r * 0.1, r * 0.45, r * 0.5);
    // 银色端帽
    ctx.fillStyle = '#ddd';
    ctx.fillRect(-r * 0.8, r * 0.25, r * 0.45, r * 0.2);
    ctx.fillRect(r * 0.35, r * 0.25, r * 0.45, r * 0.2);
    ctx.restore();
  }

  private drawIce(ctx: CanvasRenderingContext2D, x: number, y: number, cs: number, t: number): void {
    const r = cs * 0.3;
    const sparkle = Math.sin(t * 4) * 0.3 + 0.7;
    ctx.save(); ctx.translate(x, y); ctx.rotate(t * 0.5);
    // 六角雪花
    ctx.strokeStyle = `rgba(150,220,255,${sparkle})`;
    ctx.lineWidth = 2;
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r);
      ctx.stroke();
      // 小分支
      const mx = Math.cos(a) * r * 0.6;
      const my = Math.sin(a) * r * 0.6;
      ctx.beginPath();
      ctx.moveTo(mx, my);
      ctx.lineTo(mx + Math.cos(a + 0.8) * r * 0.3, my + Math.sin(a + 0.8) * r * 0.3);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(mx, my);
      ctx.lineTo(mx + Math.cos(a - 0.8) * r * 0.3, my + Math.sin(a - 0.8) * r * 0.3);
      ctx.stroke();
    }
    // 中心圆
    ctx.fillStyle = `rgba(200,240,255,${sparkle * 0.5})`;
    ctx.beginPath(); ctx.arc(0, 0, r * 0.2, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  }

  private drawFire(ctx: CanvasRenderingContext2D, x: number, y: number, cs: number, t: number): void {
    const r = cs * 0.35;
    const flicker = Math.sin(t * 8) * 0.15;
    // 外焰（橙红）
    ctx.fillStyle = '#ff6600';
    ctx.beginPath();
    ctx.moveTo(x, y - r * (1.0 + flicker));
    ctx.quadraticCurveTo(x + r * 0.7, y - r * 0.3, x + r * 0.4, y + r * 0.5);
    ctx.quadraticCurveTo(x, y + r * 0.3, x - r * 0.4, y + r * 0.5);
    ctx.quadraticCurveTo(x - r * 0.7, y - r * 0.3, x, y - r * (1.0 + flicker));
    ctx.fill();
    // 内焰（黄）
    ctx.fillStyle = '#ffcc00';
    ctx.beginPath();
    ctx.moveTo(x, y - r * (0.5 + flicker));
    ctx.quadraticCurveTo(x + r * 0.35, y, x + r * 0.2, y + r * 0.3);
    ctx.quadraticCurveTo(x, y + r * 0.2, x - r * 0.2, y + r * 0.3);
    ctx.quadraticCurveTo(x - r * 0.35, y, x, y - r * (0.5 + flicker));
    ctx.fill();
  }

  private drawGhost(ctx: CanvasRenderingContext2D, x: number, y: number, cs: number, t: number): void {
    const r = cs * 0.32;
    const float = Math.sin(t * 2) * 3;
    const gy = y + float;
    ctx.globalAlpha = (ctx.globalAlpha || 1) * (0.6 + Math.sin(t * 3) * 0.15);
    // 身体（白色半透明）
    ctx.fillStyle = '#eeeeff';
    ctx.beginPath();
    ctx.arc(x, gy - r * 0.2, r * 0.7, Math.PI, 0);
    ctx.lineTo(x + r * 0.7, gy + r * 0.5);
    // 底部波浪
    for (let i = 0; i < 4; i++) {
      const bx = x + r * 0.7 - (i + 1) * r * 0.35;
      const by = gy + r * 0.5 + (i % 2 === 0 ? r * 0.2 : 0);
      ctx.lineTo(bx, by);
    }
    ctx.closePath(); ctx.fill();
    // 眼睛
    ctx.fillStyle = '#333';
    ctx.beginPath(); ctx.arc(x - r * 0.2, gy - r * 0.25, 3, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(x + r * 0.2, gy - r * 0.25, 3, 0, Math.PI * 2); ctx.fill();
    // 嘴
    ctx.beginPath(); ctx.arc(x, gy, 2, 0, Math.PI * 2); ctx.fill();
  }

  // ===================== UI =====================

  drawUI(score: number, highScore: number, state: GameState): void {
    const ctx = this.ctx;
    const w = ctx.canvas.width;

    // 分数气泡框
    this.drawBubbleLabel(ctx, 10, 8, `⭐ 分数: ${score}`, 'left');
    this.drawBubbleLabel(ctx, w - 10, 8, `🏆 最高: ${highScore}`, 'right');

    // 暂停
    if (state === GameState.PAUSED) {
      // 毛玻璃
      ctx.fillStyle = 'rgba(0,0,0,0.45)';
      ctx.fillRect(0, 0, w, ctx.canvas.height);
      // 圆角卡片
      const cw = 240, ch = 100;
      const cx = (w - cw) / 2, cy2 = (ctx.canvas.height - ch) / 2;
      this.drawRoundedCard(ctx, cx, cy2, cw, ch);
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 28px "PingFang SC", Arial';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('⏸ 暂停', w / 2, ctx.canvas.height / 2);
    }

    if (this.comboTimer > 0 && this.comboCount >= 2) {
      this.drawComboUI(ctx);
    }

    if (this.bossWarningTimer > 0) {
      this.drawBossWarning(ctx);
    }

    this.particles.draw(ctx);
  }

  private drawBubbleLabel(ctx: CanvasRenderingContext2D, x: number, y: number, text: string, align: 'left' | 'right'): void {
    ctx.font = 'bold 14px "PingFang SC", Arial';
    const metrics = ctx.measureText(text);
    const pw = metrics.width + 16;
    const ph = 24;
    const bx = align === 'left' ? x : x - pw;

    // 圆角气泡
    ctx.fillStyle = 'rgba(0,0,0,0.45)';
    ctx.beginPath();
    ctx.roundRect(bx, y, pw, ph, 12);
    ctx.fill();

    ctx.fillStyle = '#fff';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, bx + 8, y + ph / 2);
  }

  private drawRoundedCard(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number): void {
    // 半透明毛玻璃卡片
    ctx.fillStyle = 'rgba(255,255,255,0.12)';
    ctx.beginPath();
    ctx.roundRect(x, y, w, h, 16);
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.25)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(x, y, w, h, 16);
    ctx.stroke();
  }

  private drawComboUI(ctx: CanvasRenderingContext2D): void {
    const w = ctx.canvas.width;
    const h = ctx.canvas.height;

    ctx.save();
    ctx.translate(w / 2, h * 0.3);
    ctx.scale(this.comboScale, this.comboScale);
    ctx.globalAlpha = Math.min(1, this.comboTimer / 0.3);

    ctx.font = 'bold 48px "PingFang SC", Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 4;
    const text = `x${this.comboCount} COMBO!`;
    ctx.strokeText(text, 0, 0);

    const grad = ctx.createLinearGradient(-80, -20, 80, 20);
    grad.addColorStop(0, '#ffdd00');
    grad.addColorStop(0.5, '#ff8800');
    grad.addColorStop(1, '#ff4400');
    ctx.fillStyle = grad;
    ctx.fillText(text, 0, 0);

    ctx.restore();
  }

  private drawBossWarning(ctx: CanvasRenderingContext2D): void {
    const w = ctx.canvas.width;
    const h = ctx.canvas.height;
    const intensity = Math.sin(this.bossWarningTimer * 8) * 0.5 + 0.5;

    const edgeGrad = ctx.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.3, w / 2, h / 2, Math.max(w, h) * 0.7);
    edgeGrad.addColorStop(0, 'rgba(255,0,0,0)');
    edgeGrad.addColorStop(1, `rgba(255,0,0,${0.3 * intensity})`);
    ctx.fillStyle = edgeGrad;
    ctx.fillRect(0, 0, w, h);

    ctx.save();
    ctx.globalAlpha = 0.7 + 0.3 * intensity;
    ctx.font = 'bold 36px "PingFang SC", Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#ff2222';
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 3;
    const warningText = '⚠️ BOSS来了！';
    ctx.strokeText(warningText, w / 2, h / 2);
    ctx.fillText(warningText, w / 2, h / 2);
    ctx.restore();
  }

  drawBuffs(buffs: Buff[]): void {
    if (buffs.length === 0) return;
    let y = 45;

    this.ctx.font = 'bold 12px "PingFang SC", Arial';
    this.ctx.textAlign = 'left';

    const labels: Record<string, string> = {
      [BuffType.SPEED_BOOST]: '⚡ 加速',
      [BuffType.INVINCIBLE]: '💎 无敌',
      [BuffType.MAGNET]: '🧲 磁铁',
      [BuffType.FREEZE_ENEMIES]: '❄️ 冰冻',
      [BuffType.FIRE]: '🔥 火焰',
      [BuffType.GHOST]: '👻 穿墙',
      [BuffType.POISON]: '☠️ 中毒',
      [BuffType.STUN]: '💫 眩晕',
    };

    for (const buff of buffs) {
      const label = labels[buff.type] || buff.type;
      const secs = Math.ceil(buff.remainingMs / 1000);
      this.ctx.fillStyle = buff.type === BuffType.POISON || buff.type === BuffType.STUN ? '#ff6666' : '#66ffaa';
      this.ctx.fillText(`${label} ${secs}s`, 10, y);
      y += 16;
    }
  }

  drawGameOver(score: number): void {
    const ctx = this.ctx;
    const w = ctx.canvas.width;
    const h = ctx.canvas.height;

    // 毛玻璃背景
    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    ctx.fillRect(0, 0, w, h);

    // 圆角大卡片
    const cw = 300, ch = 180;
    const cx = (w - cw) / 2, cy = (h - ch) / 2;
    this.drawRoundedCard(ctx, cx, cy, cw, ch);

    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    ctx.fillStyle = '#ff6666';
    ctx.font = 'bold 32px "PingFang SC", Arial';
    ctx.fillText('💀 游戏结束', w / 2, h / 2 - 35);

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 22px "PingFang SC", Arial';
    ctx.fillText(`得分: ${score}`, w / 2, h / 2 + 10);

    ctx.font = '14px "PingFang SC", Arial';
    ctx.fillStyle = '#cccccc';
    ctx.fillText('按 R 重新开始', w / 2, h / 2 + 50);

    this.particles.draw(ctx);
  }
}
