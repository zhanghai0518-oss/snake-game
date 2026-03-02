/**
 * 粒子效果系统 - 用于各种视觉特效
 */

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  size: number;
  color: string;
  shape: 'star' | 'circle' | 'square' | 'ring';
  alpha: number;
  rotation: number;
  rotationSpeed: number;
  gravity: number;
  shrink: boolean;
}

export class ParticleSystem {
  private particles: Particle[] = [];

  update(dt: number): void {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vy += p.gravity * dt;
      p.life -= dt;
      p.alpha = Math.max(0, p.life / p.maxLife);
      p.rotation += p.rotationSpeed * dt;
      if (p.shrink) {
        p.size = Math.max(0, p.size * (p.life / p.maxLife));
      }
      if (p.life <= 0) {
        this.particles.splice(i, 1);
      }
    }
  }

  draw(ctx: CanvasRenderingContext2D): void {
    ctx.save();
    for (const p of this.particles) {
      ctx.globalAlpha = p.alpha;
      ctx.fillStyle = p.color;
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rotation);

      switch (p.shape) {
        case 'star':
          this.drawStar(ctx, p.size);
          break;
        case 'circle':
          ctx.beginPath();
          ctx.arc(0, 0, p.size, 0, Math.PI * 2);
          ctx.fill();
          break;
        case 'square':
          ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size);
          break;
        case 'ring':
          ctx.strokeStyle = p.color;
          ctx.lineWidth = 2 * p.alpha;
          ctx.beginPath();
          ctx.arc(0, 0, p.size, 0, Math.PI * 2);
          ctx.stroke();
          break;
      }
      ctx.restore();
    }
    ctx.restore();
  }

  private drawStar(ctx: CanvasRenderingContext2D, size: number): void {
    const spikes = 4;
    const outerRadius = size;
    const innerRadius = size * 0.4;
    ctx.beginPath();
    for (let i = 0; i < spikes * 2; i++) {
      const radius = i % 2 === 0 ? outerRadius : innerRadius;
      const angle = (i * Math.PI) / spikes - Math.PI / 2;
      const x = Math.cos(angle) * radius;
      const y = Math.sin(angle) * radius;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.fill();
  }

  /** 吃食物 - 星星粒子爆炸 */
  emitEatFood(x: number, y: number, color: string): void {
    const count = 12;
    for (let i = 0; i < count; i++) {
      const angle = (i / count) * Math.PI * 2 + Math.random() * 0.5;
      const speed = 60 + Math.random() * 120;
      this.particles.push({
        x, y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 0.5 + Math.random() * 0.3,
        maxLife: 0.8,
        size: 3 + Math.random() * 4,
        color: color,
        shape: 'star',
        alpha: 1,
        rotation: Math.random() * Math.PI * 2,
        rotationSpeed: (Math.random() - 0.5) * 8,
        gravity: 0,
        shrink: true,
      });
    }
  }

  /** 蛇死亡 - 身体碎片四散 */
  emitDeath(segments: { x: number; y: number }[], cellSize: number): void {
    for (const seg of segments) {
      const cx = (seg.x + 0.5) * cellSize;
      const cy = (seg.y + 0.5) * cellSize;
      for (let i = 0; i < 4; i++) {
        const angle = Math.random() * Math.PI * 2;
        const speed = 40 + Math.random() * 100;
        this.particles.push({
          x: cx + (Math.random() - 0.5) * cellSize * 0.5,
          y: cy + (Math.random() - 0.5) * cellSize * 0.5,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          life: 0.8 + Math.random() * 0.6,
          maxLife: 1.4,
          size: 3 + Math.random() * 4,
          color: `hsl(${120 + Math.random() * 40}, 80%, ${40 + Math.random() * 30}%)`,
          shape: 'square',
          alpha: 1,
          rotation: Math.random() * Math.PI * 2,
          rotationSpeed: (Math.random() - 0.5) * 6,
          gravity: 80,
          shrink: false,
        });
      }
    }
  }

  /** Boss受伤 - 火花粒子 */
  emitBossHit(x: number, y: number): void {
    const count = 16;
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 80 + Math.random() * 150;
      this.particles.push({
        x, y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 0.3 + Math.random() * 0.4,
        maxLife: 0.7,
        size: 2 + Math.random() * 3,
        color: ['#ff4400', '#ff8800', '#ffcc00', '#ffffff'][Math.floor(Math.random() * 4)],
        shape: 'circle',
        alpha: 1,
        rotation: 0,
        rotationSpeed: 0,
        gravity: 0,
        shrink: true,
      });
    }
  }

  /** 道具拾取 - 彩色光环扩散 */
  emitItemPickup(x: number, y: number): void {
    const colors = ['#ff44ff', '#44ffff', '#ffff44', '#44ff44', '#ff4444'];
    // 扩散光环
    for (let i = 0; i < 3; i++) {
      this.particles.push({
        x, y,
        vx: 0, vy: 0,
        life: 0.5 + i * 0.15,
        maxLife: 0.5 + i * 0.15,
        size: 5 + i * 10,
        color: colors[i % colors.length],
        shape: 'ring',
        alpha: 1,
        rotation: 0,
        rotationSpeed: 0,
        gravity: 0,
        shrink: false,
      });
    }
    // 彩色小粒子
    for (let i = 0; i < 8; i++) {
      const angle = (i / 8) * Math.PI * 2;
      const speed = 50 + Math.random() * 60;
      this.particles.push({
        x, y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 0.6 + Math.random() * 0.3,
        maxLife: 0.9,
        size: 3 + Math.random() * 2,
        color: colors[Math.floor(Math.random() * colors.length)],
        shape: 'circle',
        alpha: 1,
        rotation: 0,
        rotationSpeed: 0,
        gravity: 0,
        shrink: true,
      });
    }
  }

  get count(): number {
    return this.particles.length;
  }
}
