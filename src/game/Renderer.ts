import { Snake, Direction, Position } from './Snake';
import { Food } from './Food';
import { GameConfig } from '../config/GameConfig';
import { GameState } from './Game';
import { ParticleSystem } from './ParticleSystem';

/**
 * 贪吃蛇·动物大战 - 视觉渲染器
 * 包含：蛇的高级视觉、场景效果、Combo/Boss UI、粒子系统
 */
export class Renderer {
  private ctx: CanvasRenderingContext2D;
  private config: GameConfig;
  private cellSize: number;

  // 动画状态
  private time: number = 0;
  private tonguePhase: number = 0;
  private swallowIndex: number = -1;  // 吞咽鼓起的身体索引
  private swallowTimer: number = 0;
  private hurtTimer: number = 0;       // 受伤闪红计时
  private hurtFlashCount: number = 0;

  // Combo UI
  private comboCount: number = 0;
  private comboTimer: number = 0;
  private comboScale: number = 1;

  // Boss 警告
  private bossWarningTimer: number = 0;

  // 粒子系统
  readonly particles: ParticleSystem = new ParticleSystem();

  constructor(ctx: CanvasRenderingContext2D, config: GameConfig) {
    this.ctx = ctx;
    this.config = config;
    this.cellSize = Math.min(
      ctx.canvas.width / config.gridWidth,
      ctx.canvas.height / config.gridHeight
    );
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
      // 缩放动画：先大后回弹
      const t = 1 - this.comboTimer / 1.5;
      this.comboScale = t < 0.2 ? 1 + t * 5 : 1 + (1 - t) * 0.3;
    }
    if (this.bossWarningTimer > 0) {
      this.bossWarningTimer -= dt;
    }
    this.particles.update(dt);
  }

  /** 触发吃东西动画 */
  triggerEat(): void {
    this.swallowIndex = 0;
    this.swallowTimer = 0.4;
  }

  /** 触发受伤动画 */
  triggerHurt(): void {
    this.hurtTimer = 0.6; // 闪3次，每次0.2s
    this.hurtFlashCount = 3;
  }

  /** 触发Combo显示 */
  triggerCombo(count: number): void {
    this.comboCount = count;
    this.comboTimer = 1.5;
    this.comboScale = 2;
  }

  /** 触发Boss警告 */
  triggerBossWarning(): void {
    this.bossWarningTimer = 2.0;
  }

  // ===================== 清屏与背景 =====================

  clear(): void {
    const ctx = this.ctx;
    const w = ctx.canvas.width;
    const h = ctx.canvas.height;

    // 深色渐变背景
    const grad = ctx.createLinearGradient(0, 0, 0, h);
    grad.addColorStop(0, '#0a0a1a');
    grad.addColorStop(0.5, '#12122e');
    grad.addColorStop(1, '#0a0a1a');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);
  }

  drawGrid(): void {
    const ctx = this.ctx;
    ctx.strokeStyle = 'rgba(255,255,255,0.04)';
    ctx.lineWidth = 0.5;
    for (let x = 0; x <= this.config.gridWidth; x++) {
      ctx.beginPath();
      ctx.moveTo(x * this.cellSize, 0);
      ctx.lineTo(x * this.cellSize, this.config.gridHeight * this.cellSize);
      ctx.stroke();
    }
    for (let y = 0; y <= this.config.gridHeight; y++) {
      ctx.beginPath();
      ctx.moveTo(0, y * this.cellSize);
      ctx.lineTo(this.config.gridWidth * this.cellSize, y * this.cellSize);
      ctx.stroke();
    }
  }

  // ===================== 蛇的渲染 =====================

  drawSnake(snake: Snake): void {
    const ctx = this.ctx;
    const body = snake.body;
    const cs = this.cellSize;

    if (body.length === 0) return;

    // 获取运动方向
    const dir = this.getSnakeDirection(body);

    // 受伤抖动偏移
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
      const ratio = i / body.length;
      const cx = (seg.x + 0.5) * cs;
      const cy = (seg.y + 0.5) * cs;

      // 吞咽鼓起效果
      const isSwallow = this.swallowTimer > 0 && i <= 2 && i > 0;
      const bulge = isSwallow ? 1.3 : 1.0;
      const halfSize = (cs * 0.4) * bulge;

      // 受伤闪红
      const flashRed = isHurt && Math.floor(this.hurtTimer * 10) % 2 === 0;

      // 从头到尾的颜色渐变（绿→深绿）
      const hue = 140 - ratio * 20;
      const lightness = 50 - ratio * 20;
      const baseColor = flashRed ? `hsl(0, 80%, 50%)` : `hsl(${hue}, 70%, ${lightness}%)`;
      const darkColor = flashRed ? `hsl(0, 80%, 35%)` : `hsl(${hue}, 70%, ${lightness - 10}%)`;

      // 鳞片纹理 - 交替菱形
      this.drawScaleSegment(ctx, cx, cy, halfSize, baseColor, darkColor, i);
    }

    // 画蛇头
    this.drawSnakeHead(ctx, body[0], dir, isHurt);

    ctx.restore();
  }

  private drawScaleSegment(
    ctx: CanvasRenderingContext2D,
    cx: number, cy: number, halfSize: number,
    baseColor: string, darkColor: string, index: number
  ): void {
    // 底色圆角方块
    ctx.fillStyle = baseColor;
    ctx.beginPath();
    ctx.roundRect(cx - halfSize, cy - halfSize, halfSize * 2, halfSize * 2, 3);
    ctx.fill();

    // 菱形鳞片纹理
    const isOdd = index % 2 === 0;
    ctx.fillStyle = darkColor;
    const s = halfSize * 0.6;
    ctx.beginPath();
    if (isOdd) {
      // 菱形
      ctx.moveTo(cx, cy - s);
      ctx.lineTo(cx + s, cy);
      ctx.lineTo(cx, cy + s);
      ctx.lineTo(cx - s, cy);
    } else {
      // 小菱形偏移
      ctx.moveTo(cx, cy - s * 0.7);
      ctx.lineTo(cx + s * 0.7, cy);
      ctx.lineTo(cx, cy + s * 0.7);
      ctx.lineTo(cx - s * 0.7, cy);
    }
    ctx.closePath();
    ctx.fill();
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

    // 旋转角度
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

    const headSize = cs * 0.48;

    // 三角形蛇头
    const headColor = flashRed ? '#ff3333' : '#00ee77';
    ctx.fillStyle = headColor;
    ctx.beginPath();
    ctx.moveTo(headSize, 0);                              // 尖端（前方）
    ctx.lineTo(-headSize * 0.7, -headSize * 0.8);         // 左后
    ctx.lineTo(-headSize * 0.5, 0);                       // 后中凹
    ctx.lineTo(-headSize * 0.7, headSize * 0.8);          // 右后
    ctx.closePath();
    ctx.fill();

    // 蛇头高光
    ctx.fillStyle = flashRed ? '#ff6666' : '#44ffaa';
    ctx.beginPath();
    ctx.moveTo(headSize * 0.6, 0);
    ctx.lineTo(-headSize * 0.2, -headSize * 0.4);
    ctx.lineTo(-headSize * 0.1, 0);
    ctx.lineTo(-headSize * 0.2, headSize * 0.4);
    ctx.closePath();
    ctx.fill();

    // 眼睛（朝运动方向看 - 在蛇头坐标系中向前偏移）
    const eyeOffX = headSize * 0.1;
    const eyeOffY = headSize * 0.45;
    const eyeR = cs * 0.09;
    const pupilR = cs * 0.05;

    // 左眼
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(eyeOffX, -eyeOffY, eyeR, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#111111';
    ctx.beginPath();
    ctx.arc(eyeOffX + pupilR * 0.3, -eyeOffY, pupilR, 0, Math.PI * 2);
    ctx.fill();

    // 右眼
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(eyeOffX, eyeOffY, eyeR, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#111111';
    ctx.beginPath();
    ctx.arc(eyeOffX + pupilR * 0.3, eyeOffY, pupilR, 0, Math.PI * 2);
    ctx.fill();

    // 红色分叉舌头（伸缩动画）
    const tongueLen = cs * 0.3 * (0.5 + 0.5 * Math.sin(this.tonguePhase));
    const tongueStart = headSize * 0.9;
    ctx.strokeStyle = '#ff2222';
    ctx.lineWidth = 1.5;
    // 左叉
    ctx.beginPath();
    ctx.moveTo(tongueStart, 0);
    ctx.lineTo(tongueStart + tongueLen * 0.7, 0);
    ctx.lineTo(tongueStart + tongueLen, -cs * 0.06);
    ctx.stroke();
    // 右叉
    ctx.beginPath();
    ctx.moveTo(tongueStart + tongueLen * 0.7, 0);
    ctx.lineTo(tongueStart + tongueLen, cs * 0.06);
    ctx.stroke();

    ctx.restore();
  }

  private getSnakeDirection(body: Position[]): Direction {
    if (body.length < 2) return Direction.RIGHT;
    const head = body[0];
    const neck = body[1];
    const dx = head.x - neck.x;
    const dy = head.y - neck.y;
    if (dx > 0 || dx < -1) return Direction.RIGHT;   // 包含 wrap-around
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

    // 浮动动画
    const floatY = Math.sin(this.time * 3 + food.position.x) * 2;

    // 发光效果
    ctx.shadowColor = food.color;
    ctx.shadowBlur = 12 + Math.sin(this.time * 5) * 4;

    ctx.font = `${this.cellSize * 0.8}px Arial`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(food.emoji, x, y + floatY);

    ctx.shadowBlur = 0;
  }

  // ===================== UI =====================

  drawUI(score: number, highScore: number, state: GameState): void {
    const ctx = this.ctx;
    const w = ctx.canvas.width;

    // 分数
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 16px Arial';
    ctx.textAlign = 'left';
    ctx.fillText(`分数: ${score}`, 10, 25);
    ctx.textAlign = 'right';
    ctx.fillText(`最高: ${highScore}`, w - 10, 25);

    // 暂停
    if (state === GameState.PAUSED) {
      ctx.fillStyle = 'rgba(0,0,0,0.5)';
      ctx.fillRect(0, 0, w, ctx.canvas.height);
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 32px Arial';
      ctx.textAlign = 'center';
      ctx.fillText('⏸ 暂停', w / 2, ctx.canvas.height / 2);
    }

    // Combo 连击
    if (this.comboTimer > 0 && this.comboCount >= 2) {
      this.drawComboUI(ctx);
    }

    // Boss 警告
    if (this.bossWarningTimer > 0) {
      this.drawBossWarning(ctx);
    }

    // 粒子
    this.particles.draw(ctx);
  }

  private drawComboUI(ctx: CanvasRenderingContext2D): void {
    const w = ctx.canvas.width;
    const h = ctx.canvas.height;

    ctx.save();
    ctx.translate(w / 2, h * 0.3);
    ctx.scale(this.comboScale, this.comboScale);
    ctx.globalAlpha = Math.min(1, this.comboTimer / 0.3);

    // 文字描边
    ctx.font = 'bold 48px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 4;
    const text = `x${this.comboCount} COMBO!`;
    ctx.strokeText(text, 0, 0);

    // 渐变填充
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

    // 屏幕边缘闪红
    const edgeGrad = ctx.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.3, w / 2, h / 2, Math.max(w, h) * 0.7);
    edgeGrad.addColorStop(0, 'rgba(255,0,0,0)');
    edgeGrad.addColorStop(1, `rgba(255,0,0,${0.3 * intensity})`);
    ctx.fillStyle = edgeGrad;
    ctx.fillRect(0, 0, w, h);

    // 警告文字
    ctx.save();
    ctx.globalAlpha = 0.7 + 0.3 * intensity;
    ctx.font = 'bold 36px Arial';
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

  drawGameOver(score: number): void {
    const ctx = this.ctx;
    const w = ctx.canvas.width;
    const h = ctx.canvas.height;

    ctx.fillStyle = 'rgba(0,0,0,0.7)';
    ctx.fillRect(0, 0, w, h);

    ctx.fillStyle = '#ff4444';
    ctx.font = 'bold 36px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('💀 游戏结束', w / 2, h / 2 - 30);

    ctx.fillStyle = '#ffffff';
    ctx.font = '24px Arial';
    ctx.fillText(`得分: ${score}`, w / 2, h / 2 + 15);

    ctx.font = '16px Arial';
    ctx.fillStyle = '#aaaaaa';
    ctx.fillText('按 R 重新开始', w / 2, h / 2 + 50);

    // 继续绘制粒子（死亡粒子效果）
    this.particles.draw(ctx);
  }
}
