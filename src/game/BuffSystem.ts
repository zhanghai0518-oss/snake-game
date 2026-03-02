export enum BuffType {
  SPEED_BOOST = 'speed_boost',
  INVINCIBLE = 'invincible',
  MAGNET = 'magnet',
  FREEZE_ENEMIES = 'freeze_enemies',
  FIRE = 'fire',
  GHOST = 'ghost',
  POISON = 'poison',
  STUN = 'stun',
}

export interface Buff {
  type: BuffType;
  remainingMs: number;
  data?: Record<string, unknown>;
}

export class BuffSystem {
  private buffs: Map<BuffType, Buff> = new Map();

  add(type: BuffType, durationMs: number, data?: Record<string, unknown>): void {
    this.buffs.set(type, { type, remainingMs: durationMs, data });
  }

  has(type: BuffType): boolean {
    return this.buffs.has(type);
  }

  get(type: BuffType): Buff | undefined {
    return this.buffs.get(type);
  }

  remove(type: BuffType): void {
    this.buffs.delete(type);
  }

  update(deltaMs: number): void {
    for (const [type, buff] of this.buffs) {
      buff.remainingMs -= deltaMs;
      if (buff.remainingMs <= 0) {
        this.buffs.delete(type);
      }
    }
  }

  clear(): void {
    this.buffs.clear();
  }

  getAll(): Buff[] {
    return Array.from(this.buffs.values());
  }
}
