export interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: string;
  category: 'score' | 'survival' | 'skill' | 'collection' | 'social';
  condition: AchievementCondition;
  reward: number; // 金币奖励
}

export interface AchievementCondition {
  type: 'score_reach' | 'food_streak' | 'survive_time' | 'total_food' | 'total_games'
    | 'total_score' | 'max_length' | 'no_wall_hit' | 'speed_mode' | 'skin_count'
    | 'achievement_count' | 'daily_play' | 'revive_count' | 'perfect_game' | 'custom';
  value: number;
}

export interface AchievementProgress {
  achievementId: string;
  unlocked: boolean;
  unlockedAt?: number;
  currentValue: number;
}

// 20个成就定义
export const ACHIEVEMENTS: Achievement[] = [
  { id: 'first_100', name: '初出茅庐', description: '首次达到100分', icon: '🌟', category: 'score', condition: { type: 'score_reach', value: 100 }, reward: 10 },
  { id: 'score_500', name: '小有成就', description: '单局达到500分', icon: '⭐', category: 'score', condition: { type: 'score_reach', value: 500 }, reward: 30 },
  { id: 'score_1000', name: '千分大师', description: '单局达到1000分', icon: '🏆', category: 'score', condition: { type: 'score_reach', value: 1000 }, reward: 50 },
  { id: 'score_2000', name: '传说玩家', description: '单局达到2000分', icon: '👑', category: 'score', condition: { type: 'score_reach', value: 2000 }, reward: 100 },
  { id: 'streak_10', name: '连续进食', description: '不间断连续吃10个食物', icon: '🔥', category: 'skill', condition: { type: 'food_streak', value: 10 }, reward: 20 },
  { id: 'streak_25', name: '饕餮盛宴', description: '不间断连续吃25个食物', icon: '💥', category: 'skill', condition: { type: 'food_streak', value: 25 }, reward: 50 },
  { id: 'survive_5min', name: '持久战', description: '单局存活5分钟', icon: '⏱️', category: 'survival', condition: { type: 'survive_time', value: 300 }, reward: 20 },
  { id: 'survive_10min', name: '马拉松', description: '单局存活10分钟', icon: '🏃', category: 'survival', condition: { type: 'survive_time', value: 600 }, reward: 50 },
  { id: 'survive_30min', name: '钢铁意志', description: '单局存活30分钟', icon: '🛡️', category: 'survival', condition: { type: 'survive_time', value: 1800 }, reward: 100 },
  { id: 'total_food_100', name: '美食家', description: '累计吃100个食物', icon: '🍎', category: 'collection', condition: { type: 'total_food', value: 100 }, reward: 15 },
  { id: 'total_food_1000', name: '贪吃王', description: '累计吃1000个食物', icon: '🍕', category: 'collection', condition: { type: 'total_food', value: 1000 }, reward: 80 },
  { id: 'total_games_10', name: '常客', description: '累计游玩10局', icon: '🎮', category: 'collection', condition: { type: 'total_games', value: 10 }, reward: 10 },
  { id: 'total_games_100', name: '资深玩家', description: '累计游玩100局', icon: '🎯', category: 'collection', condition: { type: 'total_games', value: 100 }, reward: 50 },
  { id: 'max_length_20', name: '长蛇阵', description: '蛇身长度达到20', icon: '🐍', category: 'skill', condition: { type: 'max_length', value: 20 }, reward: 20 },
  { id: 'max_length_50', name: '巨蟒', description: '蛇身长度达到50', icon: '🐲', category: 'skill', condition: { type: 'max_length', value: 50 }, reward: 60 },
  { id: 'total_score_10000', name: '万分俱乐部', description: '累计总分达到10000', icon: '💎', category: 'score', condition: { type: 'total_score', value: 10000 }, reward: 50 },
  { id: 'speed_master', name: '极速蛇王', description: '在速度模式下得到500分', icon: '⚡', category: 'skill', condition: { type: 'speed_mode', value: 500 }, reward: 40 },
  { id: 'skin_collector', name: '皮肤收藏家', description: '拥有5款皮肤', icon: '🎨', category: 'collection', condition: { type: 'skin_count', value: 5 }, reward: 30 },
  { id: 'daily_3', name: '连续签到', description: '连续3天游玩', icon: '📅', category: 'social', condition: { type: 'daily_play', value: 3 }, reward: 20 },
  { id: 'achievement_hunter', name: '成就猎人', description: '解锁10个成就', icon: '🏅', category: 'social', condition: { type: 'achievement_count', value: 10 }, reward: 100 },
];

export class AchievementSystem {
  private static STORAGE_KEY = 'snake_achievements';
  private progress: Map<string, AchievementProgress> = new Map();
  private onUnlock?: (achievement: Achievement) => void;

  // 累计统计
  private stats = {
    totalFood: 0,
    totalGames: 0,
    totalScore: 0,
    consecutiveDays: 0,
    lastPlayDate: '',
    ownedSkins: 1,
  };

  constructor(onUnlock?: (achievement: Achievement) => void) {
    this.onUnlock = onUnlock;
    this.load();
  }

  // 检查并更新成就进度
  checkScore(score: number): void {
    for (const a of ACHIEVEMENTS) {
      if (a.condition.type === 'score_reach' && score >= a.condition.value) {
        this.tryUnlock(a);
      }
    }
  }

  checkFoodStreak(streak: number): void {
    for (const a of ACHIEVEMENTS) {
      if (a.condition.type === 'food_streak' && streak >= a.condition.value) {
        this.tryUnlock(a);
      }
    }
  }

  checkSurviveTime(seconds: number): void {
    for (const a of ACHIEVEMENTS) {
      if (a.condition.type === 'survive_time' && seconds >= a.condition.value) {
        this.tryUnlock(a);
      }
    }
  }

  checkSnakeLength(length: number): void {
    for (const a of ACHIEVEMENTS) {
      if (a.condition.type === 'max_length' && length >= a.condition.value) {
        this.tryUnlock(a);
      }
    }
  }

  checkSpeedMode(score: number): void {
    for (const a of ACHIEVEMENTS) {
      if (a.condition.type === 'speed_mode' && score >= a.condition.value) {
        this.tryUnlock(a);
      }
    }
  }

  // 记录一局游戏结束
  recordGameEnd(score: number, foodEaten: number): void {
    this.stats.totalScore += score;
    this.stats.totalFood += foodEaten;
    this.stats.totalGames += 1;

    // 检查累计类成就
    for (const a of ACHIEVEMENTS) {
      const c = a.condition;
      if (c.type === 'total_food' && this.stats.totalFood >= c.value) this.tryUnlock(a);
      if (c.type === 'total_games' && this.stats.totalGames >= c.value) this.tryUnlock(a);
      if (c.type === 'total_score' && this.stats.totalScore >= c.value) this.tryUnlock(a);
    }

    // 连续天数
    const today = new Date().toISOString().slice(0, 10);
    if (this.stats.lastPlayDate !== today) {
      const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
      this.stats.consecutiveDays = this.stats.lastPlayDate === yesterday
        ? this.stats.consecutiveDays + 1 : 1;
      this.stats.lastPlayDate = today;
    }
    for (const a of ACHIEVEMENTS) {
      if (a.condition.type === 'daily_play' && this.stats.consecutiveDays >= a.condition.value) {
        this.tryUnlock(a);
      }
    }

    this.save();
  }

  updateSkinCount(count: number): void {
    this.stats.ownedSkins = count;
    for (const a of ACHIEVEMENTS) {
      if (a.condition.type === 'skin_count' && count >= a.condition.value) {
        this.tryUnlock(a);
      }
    }
    this.save();
  }

  private tryUnlock(achievement: Achievement): void {
    let p = this.progress.get(achievement.id);
    if (!p) {
      p = { achievementId: achievement.id, unlocked: false, currentValue: 0 };
      this.progress.set(achievement.id, p);
    }
    if (p.unlocked) return;

    p.unlocked = true;
    p.unlockedAt = Date.now();
    this.save();

    // 检查成就猎人
    const unlockedCount = this.getUnlockedCount();
    for (const a of ACHIEVEMENTS) {
      if (a.condition.type === 'achievement_count' && unlockedCount >= a.condition.value && a.id !== achievement.id) {
        this.tryUnlock(a);
      }
    }

    this.onUnlock?.(achievement);
  }

  isUnlocked(achievementId: string): boolean {
    return this.progress.get(achievementId)?.unlocked ?? false;
  }

  getUnlockedCount(): number {
    let count = 0;
    for (const p of this.progress.values()) {
      if (p.unlocked) count++;
    }
    return count;
  }

  getAllProgress(): AchievementProgress[] {
    return ACHIEVEMENTS.map(a => {
      return this.progress.get(a.id) ?? { achievementId: a.id, unlocked: false, currentValue: 0 };
    });
  }

  getStats() { return { ...this.stats }; }

  private save(): void {
    try {
      const data = {
        progress: Object.fromEntries(this.progress),
        stats: this.stats,
      };
      localStorage.setItem(AchievementSystem.STORAGE_KEY, JSON.stringify(data));
    } catch { /* ignore */ }
  }

  private load(): void {
    try {
      const raw = localStorage.getItem(AchievementSystem.STORAGE_KEY);
      if (!raw) return;
      const data = JSON.parse(raw);
      if (data.progress) {
        for (const [k, v] of Object.entries(data.progress)) {
          this.progress.set(k, v as AchievementProgress);
        }
      }
      if (data.stats) Object.assign(this.stats, data.stats);
    } catch { /* ignore */ }
  }
}
