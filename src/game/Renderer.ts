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

    // 温暖土黄色渐变背景
    const grad = ctx.createLinearGradient(0, 0, 0, h);
    grad.addColorStop(0, '#d4b876');
    grad.addColorStop(0.5, '#c4a265');
    grad.addColorStop(1, '#b89555');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);
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

    // 淡棕色虚线网格
    ctx.strokeStyle = 'rgba(139, 110, 70, 0.12)';
    ctx.lineWidth = 0.5;
    ctx.setLineDash([3, 5]);
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
    ctx.setLineDash([]);

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

  // ===================== 动物渲染（高清emoji + 动画特效） =====================

  private animalEmojis: Record<string, string> = {
    mouse: '🐭',
    frog: '🐸',
    rabbit: '🐰',
    snake_egg: '🥚',
    bird_egg: '🪺',
    eagle: '🦅',
    hedgehog: '🦔',
    poison_frog: '☠️',
    diamond: '💎',
    magnet: '🧲',
    ice: '❄️',
    fire: '🔥',
    ghost: '👻',
  };

  drawAnimal(animal: Animal): void {
    const ctx = this.ctx;
    const cs = this.cellSize;
    const x = (animal.position.x + 0.5) * cs;
    const y = (animal.position.y + 0.5) * cs;
    const t = this.time;

    ctx.save();

    if (animal.frozen) {
      ctx.globalAlpha = 0.5;
      ctx.shadowColor = '#66ccff';
      ctx.shadowBlur = 12;
    }
    if (animal.def.type === AnimalType.POISON_FROG) {
      ctx.globalAlpha = animal.flashOn ? 1.0 : 0.3;
      ctx.shadowColor = '#aa00ff';
      ctx.shadowBlur = 10;
    }

    // 猎物底部阴影
    if (animal.def.category === 'prey') {
      ctx.fillStyle = 'rgba(0,0,0,0.18)';
      ctx.beginPath();
      ctx.ellipse(x, y + cs * 0.38, cs * 0.22, cs * 0.07, 0, 0, Math.PI * 2);
      ctx.fill();
    }

    // 天敌红色虚线警告圈（闪烁）
    if (animal.def.category === 'predator') {
      const warningAlpha = 0.25 + Math.sin(t * 6) * 0.2;
      ctx.strokeStyle = `rgba(255,30,30,${warningAlpha})`;
      ctx.lineWidth = 2;
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.arc(x, y, cs * 0.44, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);
    }

    // 道具金色光圈（脉动）
    if (animal.def.category === 'powerup') {
      const glowAlpha = 0.35 + Math.sin(t * 4) * 0.25;
      ctx.strokeStyle = `rgba(255,215,0,${glowAlpha})`;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(x, y, cs * 0.44, 0, Math.PI * 2);
      ctx.stroke();
    }

    // 手绘动物 or emoji道具
    switch (animal.def.type) {
      case AnimalType.MOUSE:
        this.drawMouse(ctx, x, y, cs, t);
        break;
      case AnimalType.FROG:
        this.drawFrog(ctx, x, y, cs, t);
        break;
      case AnimalType.RABBIT:
        this.drawRabbit(ctx, x, y, cs, t);
        break;
      case AnimalType.SNAKE_EGG:
        this.drawSnakeEgg(ctx, x, y, cs, t);
        break;
      case AnimalType.BIRD_EGG:
        this.drawBirdEgg(ctx, x, y, cs, t);
        break;
      case AnimalType.EAGLE:
        this.drawEagle(ctx, x, y, cs, t);
        break;
      case AnimalType.HEDGEHOG:
        this.drawHedgehog(ctx, x, y, cs, t);
        break;
      case AnimalType.POISON_FROG:
        this.drawPoisonFrog(ctx, x, y, cs, t);
        break;
      case AnimalType.DIAMOND:
        this.drawDiamond(ctx, x, y, cs, t);
        break;
      default: {
        // 道具用emoji + 动画光晕
        const emoji = this.animalEmojis[animal.def.type] || '❓';
        let offsetX = 0, offsetY = 0, scale = 1, rotation = 0;
        switch (animal.def.type) {
          case AnimalType.MAGNET:
            scale = 1 + Math.sin(t * 5) * 0.08;
            ctx.shadowColor = '#ff4444';
            ctx.shadowBlur = 10;
            break;
          case AnimalType.ICE:
            rotation = t * 1.5;
            ctx.shadowColor = '#88ddff';
            ctx.shadowBlur = 14;
            break;
          case AnimalType.FIRE:
            offsetY = Math.sin(t * 8) * cs * 0.05;
            scale = 1 + Math.sin(t * 10) * 0.06;
            ctx.shadowColor = '#ff6600';
            ctx.shadowBlur = 16;
            break;
          case AnimalType.GHOST:
            offsetY = Math.sin(t * 2) * cs * 0.1;
            ctx.globalAlpha *= (0.7 + Math.sin(t * 3) * 0.2);
            ctx.shadowColor = '#aaaaff';
            ctx.shadowBlur = 12;
            break;
        }
        ctx.save();
        ctx.translate(x + offsetX, y + offsetY);
        ctx.rotate(rotation);
        ctx.scale(scale, scale);
        const fontSize = cs * 0.75;
        ctx.font = `${fontSize}px "Apple Color Emoji", "Segoe UI Emoji", "Noto Color Emoji", sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(emoji, 0, 0);
        ctx.restore();
        break;
      }
    }

    ctx.restore();

    // 毒蛙冒毒气泡
    if (animal.def.type === AnimalType.POISON_FROG) {
      this.drawPoisonBubbles(ctx, x, y, cs, t);
    }
  }

  // =================== 手绘动物 ===================

  private drawMouse(ctx: CanvasRenderingContext2D, x: number, y: number, cs: number, t: number): void {
    const s = cs * 0.42;
    // 抖动动画
    const ox = Math.sin(t * 12) * s * 0.06;
    const oy = Math.cos(t * 10) * s * 0.04;
    ctx.save();
    ctx.translate(x + ox, y + oy);

    // 尾巴（S形粉色）
    ctx.strokeStyle = '#ff8899';
    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(0, s * 0.4);
    ctx.bezierCurveTo(s * 0.5, s * 0.6, -s * 0.3, s * 0.9, s * 0.4, s * 1.1);
    ctx.stroke();

    // 身体（灰色圆）
    ctx.fillStyle = '#777777';
    ctx.strokeStyle = '#333';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(0, 0, s * 0.55, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // 耳朵（左）
    ctx.fillStyle = '#999';
    ctx.beginPath();
    ctx.arc(-s * 0.35, -s * 0.45, s * 0.28, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#555';
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.fillStyle = '#ffaaaa';
    ctx.beginPath();
    ctx.arc(-s * 0.35, -s * 0.45, s * 0.17, 0, Math.PI * 2);
    ctx.fill();

    // 耳朵（右）
    ctx.fillStyle = '#999';
    ctx.beginPath();
    ctx.arc(s * 0.35, -s * 0.45, s * 0.28, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#555';
    ctx.stroke();
    ctx.fillStyle = '#ffaaaa';
    ctx.beginPath();
    ctx.arc(s * 0.35, -s * 0.45, s * 0.17, 0, Math.PI * 2);
    ctx.fill();

    // 眼睛
    ctx.fillStyle = '#111';
    ctx.beginPath();
    ctx.arc(-s * 0.18, -s * 0.1, s * 0.1, 0, Math.PI * 2);
    ctx.fill();
    ctx.arc(s * 0.18, -s * 0.1, s * 0.1, 0, Math.PI * 2);
    ctx.fill();
    // 高光
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(-s * 0.15, -s * 0.14, s * 0.04, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(s * 0.21, -s * 0.14, s * 0.04, 0, Math.PI * 2);
    ctx.fill();

    // 粉红大鼻子
    ctx.fillStyle = '#ff6688';
    ctx.beginPath();
    ctx.arc(0, s * 0.05, s * 0.1, 0, Math.PI * 2);
    ctx.fill();

    // 胡须（每边3根）
    ctx.strokeStyle = '#444';
    ctx.lineWidth = 1.5;
    for (let i = -1; i <= 1; i++) {
      ctx.beginPath();
      ctx.moveTo(-s * 0.15, s * 0.08 + i * s * 0.07);
      ctx.lineTo(-s * 0.55, s * 0.02 + i * s * 0.12);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(s * 0.15, s * 0.08 + i * s * 0.07);
      ctx.lineTo(s * 0.55, s * 0.02 + i * s * 0.12);
      ctx.stroke();
    }

    ctx.restore();
  }

  private drawFrog(ctx: CanvasRenderingContext2D, x: number, y: number, cs: number, t: number): void {
    const s = cs * 0.45;
    // 跳跃弹性动画
    const jump = Math.sin(t * 4);
    const oy = -Math.abs(jump) * s * 0.3;
    const scaleX = 1 + jump * 0.06;
    const scaleY = 1 - jump * 0.06;
    ctx.save();
    ctx.translate(x, y + oy);
    ctx.scale(scaleX, scaleY);

    // 后腿
    ctx.fillStyle = '#22aa22';
    ctx.strokeStyle = '#116611';
    ctx.lineWidth = 2;
    // 左腿
    ctx.beginPath();
    ctx.ellipse(-s * 0.4, s * 0.35, s * 0.18, s * 0.1, -0.3, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    // 右腿
    ctx.beginPath();
    ctx.ellipse(s * 0.4, s * 0.35, s * 0.18, s * 0.1, 0.3, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // 身体（鲜绿椭圆）
    ctx.fillStyle = '#22bb22';
    ctx.strokeStyle = '#117711';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.ellipse(0, s * 0.05, s * 0.48, s * 0.4, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // 浅绿肚皮
    ctx.fillStyle = '#88ee66';
    ctx.beginPath();
    ctx.ellipse(0, s * 0.12, s * 0.28, s * 0.22, 0, 0, Math.PI * 2);
    ctx.fill();

    // 红色腮帮
    ctx.fillStyle = 'rgba(255,80,80,0.5)';
    ctx.beginPath();
    ctx.arc(-s * 0.32, s * 0.05, s * 0.1, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(s * 0.32, s * 0.05, s * 0.1, 0, Math.PI * 2);
    ctx.fill();

    // 大鼓眼（凸出头顶）
    // 左眼
    ctx.fillStyle = '#fff';
    ctx.strokeStyle = '#117711';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(-s * 0.22, -s * 0.35, s * 0.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#111';
    ctx.beginPath();
    ctx.arc(-s * 0.22, -s * 0.32, s * 0.12, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(-s * 0.19, -s * 0.37, s * 0.05, 0, Math.PI * 2);
    ctx.fill();

    // 右眼
    ctx.fillStyle = '#fff';
    ctx.strokeStyle = '#117711';
    ctx.beginPath();
    ctx.arc(s * 0.22, -s * 0.35, s * 0.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#111';
    ctx.beginPath();
    ctx.arc(s * 0.22, -s * 0.32, s * 0.12, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(s * 0.25, -s * 0.37, s * 0.05, 0, Math.PI * 2);
    ctx.fill();

    // 宽嘴巴
    ctx.strokeStyle = '#116611';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(0, s * 0.02, s * 0.25, 0.1, Math.PI - 0.1);
    ctx.stroke();

    ctx.restore();
  }

  private drawRabbit(ctx: CanvasRenderingContext2D, x: number, y: number, cs: number, t: number): void {
    const s = cs * 0.42;
    // 蹦跳动画
    const oy = -Math.abs(Math.sin(t * 5)) * s * 0.25;
    const earWave = Math.sin(t * 3) * 0.12;
    ctx.save();
    ctx.translate(x, y + oy);

    // 短尾巴
    ctx.fillStyle = '#fff';
    ctx.strokeStyle = '#bbb';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(0, s * 0.45, s * 0.12, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // 身体（雪白圆）
    ctx.fillStyle = '#ffffff';
    ctx.strokeStyle = '#888';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.arc(0, 0, s * 0.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // 超长耳朵（左）
    ctx.save();
    ctx.rotate(-0.15 + earWave);
    ctx.fillStyle = '#fff';
    ctx.strokeStyle = '#888';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.ellipse(-s * 0.18, -s * 0.75, s * 0.12, s * 0.35, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#ffaaaa';
    ctx.beginPath();
    ctx.ellipse(-s * 0.18, -s * 0.75, s * 0.07, s * 0.25, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // 超长耳朵（右）
    ctx.save();
    ctx.rotate(0.15 - earWave);
    ctx.fillStyle = '#fff';
    ctx.strokeStyle = '#888';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.ellipse(s * 0.18, -s * 0.75, s * 0.12, s * 0.35, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#ffaaaa';
    ctx.beginPath();
    ctx.ellipse(s * 0.18, -s * 0.75, s * 0.07, s * 0.25, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // 大红色眼睛（宝石红）
    ctx.fillStyle = '#cc0022';
    ctx.beginPath();
    ctx.arc(-s * 0.17, -s * 0.08, s * 0.09, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(s * 0.17, -s * 0.08, s * 0.09, 0, Math.PI * 2);
    ctx.fill();
    // 高光
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(-s * 0.14, -s * 0.12, s * 0.035, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(s * 0.2, -s * 0.12, s * 0.035, 0, Math.PI * 2);
    ctx.fill();

    // 倒三角粉鼻子
    ctx.fillStyle = '#ff7799';
    ctx.beginPath();
    ctx.moveTo(0, s * 0.0);
    ctx.lineTo(-s * 0.07, -s * 0.08);
    ctx.lineTo(s * 0.07, -s * 0.08);
    ctx.closePath();
    ctx.fill();

    // Y形嘴
    ctx.strokeStyle = '#999';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(0, s * 0.02);
    ctx.lineTo(0, s * 0.12);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(0, s * 0.12);
    ctx.lineTo(-s * 0.08, s * 0.2);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(0, s * 0.12);
    ctx.lineTo(s * 0.08, s * 0.2);
    ctx.stroke();

    // 门牙
    ctx.fillStyle = '#fff';
    ctx.strokeStyle = '#ccc';
    ctx.lineWidth = 1;
    ctx.fillRect(-s * 0.05, s * 0.12, s * 0.045, s * 0.08);
    ctx.strokeRect(-s * 0.05, s * 0.12, s * 0.045, s * 0.08);
    ctx.fillRect(s * 0.005, s * 0.12, s * 0.045, s * 0.08);
    ctx.strokeRect(s * 0.005, s * 0.12, s * 0.045, s * 0.08);

    ctx.restore();
  }

  private drawSnakeEgg(ctx: CanvasRenderingContext2D, x: number, y: number, cs: number, t: number): void {
    const s = cs * 0.38;
    const rot = Math.sin(t * 2) * 0.1;
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(rot);

    // 蛋形
    ctx.fillStyle = '#fff8ee';
    ctx.strokeStyle = '#aa8855';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.ellipse(0, 0, s * 0.38, s * 0.48, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // 棕色斑纹
    ctx.fillStyle = '#bb9966';
    const spots = [[- s * 0.1, -s * 0.15, s * 0.07], [s * 0.12, s * 0.1, s * 0.06], [-s * 0.05, s * 0.2, s * 0.05]];
    for (const sp of spots) {
      ctx.beginPath();
      ctx.arc(sp[0], sp[1], sp[2], 0, Math.PI * 2);
      ctx.fill();
    }

    // 裂纹
    ctx.strokeStyle = '#998866';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(-s * 0.05, -s * 0.4);
    ctx.lineTo(s * 0.02, -s * 0.3);
    ctx.lineTo(-s * 0.08, -s * 0.22);
    ctx.stroke();

    ctx.restore();
  }

  private drawBirdEgg(ctx: CanvasRenderingContext2D, x: number, y: number, cs: number, t: number): void {
    const s = cs * 0.38;
    const shake = Math.sin(t * 20) * s * 0.02 * (Math.sin(t * 0.5) > 0.8 ? 1 : 0);
    ctx.save();
    ctx.translate(x + shake, y);

    // 草窝底座
    ctx.fillStyle = '#8B6914';
    ctx.beginPath();
    ctx.ellipse(0, s * 0.32, s * 0.45, s * 0.15, 0, 0, Math.PI * 2);
    ctx.fill();
    // 草丝
    ctx.strokeStyle = '#A0822A';
    ctx.lineWidth = 1.5;
    for (let i = -3; i <= 3; i++) {
      ctx.beginPath();
      ctx.moveTo(i * s * 0.12, s * 0.28);
      ctx.lineTo(i * s * 0.15 + Math.sin(i) * s * 0.05, s * 0.18);
      ctx.stroke();
    }

    // 浅蓝蛋
    ctx.fillStyle = '#aaddff';
    ctx.strokeStyle = '#5599cc';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.ellipse(0, -s * 0.05, s * 0.32, s * 0.42, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // 深蓝斑点
    ctx.fillStyle = '#4488bb';
    const dots = [[-s * 0.1, -s * 0.2], [s * 0.12, -s * 0.05], [-s * 0.05, s * 0.15], [s * 0.08, -s * 0.3]];
    for (const d of dots) {
      ctx.beginPath();
      ctx.arc(d[0], d[1], s * 0.05, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();
  }

  private drawEagle(ctx: CanvasRenderingContext2D, x: number, y: number, cs: number, t: number): void {
    const s = cs * 0.45;
    const wingFlap = Math.sin(t * 5) * 0.35;
    const oy = Math.sin(t * 3) * s * 0.15;
    ctx.save();
    ctx.translate(x, y + oy);

    // 翅膀（左）
    ctx.save();
    ctx.rotate(-wingFlap);
    ctx.fillStyle = '#5C3317';
    ctx.beginPath();
    ctx.moveTo(-s * 0.15, 0);
    ctx.bezierCurveTo(-s * 0.7, -s * 0.3, -s * 0.9, -s * 0.1, -s * 0.75, s * 0.15);
    ctx.bezierCurveTo(-s * 0.5, s * 0.1, -s * 0.3, s * 0.05, -s * 0.15, 0);
    ctx.fill();
    ctx.restore();

    // 翅膀（右）
    ctx.save();
    ctx.rotate(wingFlap);
    ctx.fillStyle = '#5C3317';
    ctx.beginPath();
    ctx.moveTo(s * 0.15, 0);
    ctx.bezierCurveTo(s * 0.7, -s * 0.3, s * 0.9, -s * 0.1, s * 0.75, s * 0.15);
    ctx.bezierCurveTo(s * 0.5, s * 0.1, s * 0.3, s * 0.05, s * 0.15, 0);
    ctx.fill();
    ctx.restore();

    // 身体
    ctx.fillStyle = '#6B3A1F';
    ctx.beginPath();
    ctx.ellipse(0, s * 0.05, s * 0.25, s * 0.35, 0, 0, Math.PI * 2);
    ctx.fill();

    // 白色头部
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(0, -s * 0.28, s * 0.2, 0, Math.PI * 2);
    ctx.fill();

    // 锐利橙色眼睛
    ctx.fillStyle = '#ff8800';
    ctx.beginPath();
    ctx.arc(-s * 0.08, -s * 0.3, s * 0.06, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(s * 0.08, -s * 0.3, s * 0.06, 0, Math.PI * 2);
    ctx.fill();
    // 黑瞳
    ctx.fillStyle = '#111';
    ctx.beginPath();
    ctx.arc(-s * 0.08, -s * 0.3, s * 0.03, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(s * 0.08, -s * 0.3, s * 0.03, 0, Math.PI * 2);
    ctx.fill();

    // 弯钩黄嘴
    ctx.fillStyle = '#ffcc00';
    ctx.beginPath();
    ctx.moveTo(0, -s * 0.2);
    ctx.lineTo(-s * 0.06, -s * 0.15);
    ctx.quadraticCurveTo(0, -s * 0.05, s * 0.02, -s * 0.08);
    ctx.lineTo(s * 0.06, -s * 0.15);
    ctx.closePath();
    ctx.fill();

    // 尾巴
    ctx.fillStyle = '#4A2A0F';
    ctx.beginPath();
    ctx.moveTo(-s * 0.1, s * 0.35);
    ctx.lineTo(0, s * 0.55);
    ctx.lineTo(s * 0.1, s * 0.35);
    ctx.closePath();
    ctx.fill();

    ctx.restore();
  }

  private drawHedgehog(ctx: CanvasRenderingContext2D, x: number, y: number, cs: number, t: number): void {
    const s = cs * 0.42;
    const rot = Math.sin(t * 1.5) * 0.08;
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(rot);

    // 刺（背面三角形）
    ctx.fillStyle = '#5C3317';
    for (let a = -2.5; a <= 0.8; a += 0.35) {
      const sx = Math.cos(a) * s * 0.45;
      const sy = Math.sin(a) * s * 0.4;
      const dx = Math.cos(a) * s * 0.25;
      const dy = Math.sin(a) * s * 0.2;
      ctx.beginPath();
      ctx.moveTo(sx + dy * 0.3, sy - dx * 0.3);
      ctx.lineTo(sx - dy * 0.3, sy + dx * 0.3);
      ctx.lineTo(sx + dx, sy + dy);
      ctx.closePath();
      ctx.fill();
    }

    // 棕色半球身体
    ctx.fillStyle = '#8B5E3C';
    ctx.beginPath();
    ctx.arc(0, 0, s * 0.4, 0, Math.PI * 2);
    ctx.fill();

    // 米色小脸
    ctx.fillStyle = '#F5DEB3';
    ctx.beginPath();
    ctx.ellipse(s * 0.2, s * 0.05, s * 0.22, s * 0.2, 0, 0, Math.PI * 2);
    ctx.fill();

    // 小黑眼
    ctx.fillStyle = '#111';
    ctx.beginPath();
    ctx.arc(s * 0.28, -s * 0.02, s * 0.05, 0, Math.PI * 2);
    ctx.fill();

    // 小黑鼻
    ctx.fillStyle = '#111';
    ctx.beginPath();
    ctx.arc(s * 0.4, s * 0.08, s * 0.04, 0, Math.PI * 2);
    ctx.fill();

    // 四条小短腿
    ctx.fillStyle = '#8B5E3C';
    ctx.beginPath();
    ctx.ellipse(-s * 0.2, s * 0.35, s * 0.07, s * 0.1, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(s * 0.1, s * 0.35, s * 0.07, s * 0.1, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(-s * 0.1, s * 0.38, s * 0.06, s * 0.08, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(s * 0.2, s * 0.38, s * 0.06, s * 0.08, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }

  private drawPoisonFrog(ctx: CanvasRenderingContext2D, x: number, y: number, cs: number, t: number): void {
    const s = cs * 0.42;
    const sc = 1 + Math.sin(t * 6) * 0.05;
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(sc, sc);

    // 紫色身体
    ctx.fillStyle = '#9933cc';
    ctx.strokeStyle = '#551a8b';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.ellipse(0, s * 0.05, s * 0.45, s * 0.38, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // 鲜红色警告斑点
    ctx.fillStyle = '#ff2222';
    const redSpots = [[-s * 0.15, -s * 0.05, s * 0.08], [s * 0.2, s * 0.1, s * 0.07], [-s * 0.05, s * 0.2, s * 0.06], [s * 0.1, -s * 0.15, s * 0.05]];
    for (const sp of redSpots) {
      ctx.beginPath();
      ctx.arc(sp[0], sp[1], sp[2], 0, Math.PI * 2);
      ctx.fill();
    }

    // 邪恶红色眼睛
    ctx.fillStyle = '#ffcc00';
    ctx.beginPath();
    ctx.arc(-s * 0.2, -s * 0.3, s * 0.16, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(s * 0.2, -s * 0.3, s * 0.16, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#cc0000';
    ctx.beginPath();
    ctx.ellipse(-s * 0.2, -s * 0.28, s * 0.05, s * 0.1, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(s * 0.2, -s * 0.28, s * 0.05, s * 0.1, 0, 0, Math.PI * 2);
    ctx.fill();

    // 邪恶嘴
    ctx.strokeStyle = '#330066';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(0, s * 0.05, s * 0.2, 0.2, Math.PI - 0.2);
    ctx.stroke();
    // 尖牙
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.moveTo(-s * 0.1, s * 0.15);
    ctx.lineTo(-s * 0.07, s * 0.25);
    ctx.lineTo(-s * 0.04, s * 0.15);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(s * 0.04, s * 0.15);
    ctx.lineTo(s * 0.07, s * 0.25);
    ctx.lineTo(s * 0.1, s * 0.15);
    ctx.fill();

    ctx.restore();
  }

  private drawDiamond(ctx: CanvasRenderingContext2D, x: number, y: number, cs: number, t: number): void {
    const s = cs * 0.35;
    const rot = Math.sin(t * 2) * 0.15;
    const sc = 1 + Math.sin(t * 4) * 0.1;
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(rot);
    ctx.scale(sc, sc);

    // 金色光晕
    ctx.shadowColor = '#ffdd00';
    ctx.shadowBlur = 15 + Math.sin(t * 6) * 8;

    // 钻石形状（上半菱形+下半三角）
    const grad = ctx.createLinearGradient(-s * 0.4, -s * 0.5, s * 0.4, s * 0.5);
    grad.addColorStop(0, '#88ddff');
    grad.addColorStop(0.4, '#55ccff');
    grad.addColorStop(0.7, '#aaeeff');
    grad.addColorStop(1, '#44aadd');
    ctx.fillStyle = grad;

    // 上半部分（梯形）
    ctx.beginPath();
    ctx.moveTo(0, -s * 0.55);
    ctx.lineTo(s * 0.45, -s * 0.1);
    ctx.lineTo(-s * 0.45, -s * 0.1);
    ctx.closePath();
    ctx.fill();

    // 下半部分（三角）
    ctx.beginPath();
    ctx.moveTo(-s * 0.45, -s * 0.1);
    ctx.lineTo(s * 0.45, -s * 0.1);
    ctx.lineTo(0, s * 0.55);
    ctx.closePath();
    ctx.fill();

    // 描边
    ctx.strokeStyle = '#3399cc';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(0, -s * 0.55);
    ctx.lineTo(s * 0.45, -s * 0.1);
    ctx.lineTo(0, s * 0.55);
    ctx.lineTo(-s * 0.45, -s * 0.1);
    ctx.closePath();
    ctx.stroke();

    // 内部折线（切面感）
    ctx.strokeStyle = 'rgba(255,255,255,0.5)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(-s * 0.2, -s * 0.1);
    ctx.lineTo(0, -s * 0.35);
    ctx.lineTo(s * 0.2, -s * 0.1);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(-s * 0.2, -s * 0.1);
    ctx.lineTo(0, s * 0.55);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(s * 0.2, -s * 0.1);
    ctx.lineTo(0, s * 0.55);
    ctx.stroke();

    // 闪光高光
    const flashAlpha = 0.4 + Math.sin(t * 8) * 0.4;
    ctx.fillStyle = `rgba(255,255,255,${flashAlpha})`;
    ctx.beginPath();
    ctx.arc(-s * 0.1, -s * 0.25, s * 0.08, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }

  private drawPoisonBubbles(ctx: CanvasRenderingContext2D, x: number, y: number, cs: number, t: number): void {
    ctx.fillStyle = 'rgba(170,0,255,0.5)';
    for (let i = 0; i < 4; i++) {
      const bx = x + Math.sin(t * 2 + i * 1.8) * cs * 0.3;
      const by = y - cs * 0.3 - ((t * 30 + i * 18) % (cs * 0.6));
      const br = 2.5 + Math.sin(t * 3 + i) * 1.5;
      ctx.beginPath();
      ctx.arc(bx, by, br, 0, Math.PI * 2);
      ctx.fill();
    }
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

  // ===================== 关卡UI =====================

  drawLevelInfo(level: number, name: string, progress: number, score: number, targetScore: number): void {
    const ctx = this.ctx;
    const w = ctx.canvas.width;

    // 关卡标签（左上角，在分数下方）
    const levelText = `第${level}关 ${name}`;
    ctx.font = 'bold 13px "PingFang SC", Arial';
    const metrics = ctx.measureText(levelText);
    const pw = metrics.width + 16;
    const ph = 22;
    const bx = 10;
    const by = 36;

    ctx.fillStyle = 'rgba(0,0,0,0.45)';
    ctx.beginPath();
    ctx.roundRect(bx, by, pw, ph, 11);
    ctx.fill();

    ctx.fillStyle = '#ffdd44';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText(levelText, bx + 8, by + ph / 2);

    // 进度条
    const barX = 10;
    const barY = by + ph + 4;
    const barW = Math.min(180, w - 20);
    const barH = 10;

    // 背景
    ctx.fillStyle = 'rgba(0,0,0,0.35)';
    ctx.beginPath();
    ctx.roundRect(barX, barY, barW, barH, 5);
    ctx.fill();

    // 填充
    const fillW = barW * Math.min(1, progress);
    if (fillW > 0) {
      const grad = ctx.createLinearGradient(barX, barY, barX + barW, barY);
      grad.addColorStop(0, '#44dd44');
      grad.addColorStop(1, '#ffdd00');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.roundRect(barX, barY, fillW, barH, 5);
      ctx.fill();
    }

    // 分数文字
    const scoreText = isFinite(targetScore) ? `${score}/${targetScore}` : `${score}/∞`;
    ctx.font = 'bold 9px "PingFang SC", Arial';
    ctx.fillStyle = '#fff';
    ctx.textAlign = 'center';
    ctx.fillText(scoreText, barX + barW / 2, barY + barH / 2 + 1);
  }

  // 通关庆祝：半透明遮罩 + 大字
  private levelUpTimer: number = 0;
  private levelUpName: string = '';
  private levelUpLevel: number = 0;

  triggerLevelUp(level: number, name: string): void {
    this.levelUpTimer = 2.0;
    this.levelUpLevel = level;
    this.levelUpName = name;
  }

  drawLevelUp(): void {
    if (this.levelUpTimer <= 0) return;
    const ctx = this.ctx;
    const w = ctx.canvas.width;
    const h = ctx.canvas.height;

    // Fade
    const alpha = Math.min(1, this.levelUpTimer / 0.3);
    ctx.fillStyle = `rgba(0,0,0,${0.5 * alpha})`;
    ctx.fillRect(0, 0, w, h);

    // Card
    const cw = 320, ch = 140;
    const cx = (w - cw) / 2, cy = (h - ch) / 2;
    ctx.fillStyle = `rgba(255,215,0,${0.15 * alpha})`;
    ctx.beginPath();
    ctx.roundRect(cx, cy, cw, ch, 18);
    ctx.fill();
    ctx.strokeStyle = `rgba(255,215,0,${0.5 * alpha})`;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.roundRect(cx, cy, cw, ch, 18);
    ctx.stroke();

    ctx.globalAlpha = alpha;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    // 🎉 title
    ctx.font = 'bold 30px "PingFang SC", Arial';
    ctx.fillStyle = '#ffdd00';
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 3;
    const title = `🎉 第${this.levelUpLevel}关 通关！`;
    ctx.strokeText(title, w / 2, h / 2 - 25);
    ctx.fillText(title, w / 2, h / 2 - 25);

    ctx.font = 'bold 20px "PingFang SC", Arial';
    ctx.fillStyle = '#fff';
    ctx.fillText(`进入: ${this.levelUpName}`, w / 2, h / 2 + 20);

    ctx.globalAlpha = 1;
  }

  updateLevelUpTimer(dt: number): void {
    if (this.levelUpTimer > 0) {
      this.levelUpTimer -= dt;
    }
  }

  get isShowingLevelUp(): boolean {
    return this.levelUpTimer > 0;
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
