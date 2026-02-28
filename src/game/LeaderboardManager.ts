export interface LeaderboardEntry {
  playerName: string;
  score: number;
  timestamp: number;
  gameMode: string;
}

export type LeaderboardType = 'daily' | 'allTime' | 'friends';

export class LeaderboardManager {
  private static STORAGE_KEY = 'snake_leaderboard';
  private localEntries: LeaderboardEntry[] = [];
  private onlineEntries: Map<LeaderboardType, LeaderboardEntry[]> = new Map();
  private friendsList: string[] = [];

  constructor() {
    this.loadLocal();
  }

  // 提交分数
  submitScore(playerName: string, score: number, gameMode: string): LeaderboardEntry {
    const entry: LeaderboardEntry = {
      playerName,
      score,
      timestamp: Date.now(),
      gameMode,
    };
    this.localEntries.push(entry);
    this.saveLocal();
    return entry;
  }

  // 提交分数到在线排行榜（模拟）
  async submitOnlineScore(entry: LeaderboardEntry): Promise<boolean> {
    // 实际项目中对接后端 API
    console.log('[Leaderboard] 提交在线分数:', entry);
    return true;
  }

  // 获取每日排行榜
  getDailyLeaderboard(limit: number = 20): LeaderboardEntry[] {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayTimestamp = todayStart.getTime();

    return this.localEntries
      .filter(e => e.timestamp >= todayTimestamp)
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);
  }

  // 获取总榜
  getAllTimeLeaderboard(limit: number = 50): LeaderboardEntry[] {
    return this.localEntries
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);
  }

  // 获取好友排行榜
  getFriendsLeaderboard(limit: number = 20): LeaderboardEntry[] {
    const friendSet = new Set(this.friendsList);
    return this.localEntries
      .filter(e => friendSet.has(e.playerName))
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);
  }

  // 获取排行榜
  getLeaderboard(type: LeaderboardType, limit?: number): LeaderboardEntry[] {
    switch (type) {
      case 'daily': return this.getDailyLeaderboard(limit);
      case 'allTime': return this.getAllTimeLeaderboard(limit);
      case 'friends': return this.getFriendsLeaderboard(limit);
    }
  }

  // 获取在线排行榜（模拟）
  async fetchOnlineLeaderboard(type: LeaderboardType): Promise<LeaderboardEntry[]> {
    // 实际项目中对接后端 API
    const cached = this.onlineEntries.get(type);
    return cached ?? [];
  }

  // 添加好友
  addFriend(name: string): void {
    if (!this.friendsList.includes(name)) {
      this.friendsList.push(name);
      this.saveFriends();
    }
  }

  // 移除好友
  removeFriend(name: string): void {
    this.friendsList = this.friendsList.filter(f => f !== name);
    this.saveFriends();
  }

  getFriends(): string[] {
    return [...this.friendsList];
  }

  // 获取玩家排名
  getPlayerRank(playerName: string, type: LeaderboardType = 'allTime'): number {
    const board = this.getLeaderboard(type, 999);
    const idx = board.findIndex(e => e.playerName === playerName);
    return idx === -1 ? -1 : idx + 1;
  }

  // 获取玩家最高分
  getPlayerBest(playerName: string): number {
    const scores = this.localEntries.filter(e => e.playerName === playerName);
    return scores.length > 0 ? Math.max(...scores.map(e => e.score)) : 0;
  }

  // 清除每日数据（可定时调用）
  clearDailyEntries(): void {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    this.localEntries = this.localEntries.filter(e => e.timestamp >= todayStart.getTime());
    this.saveLocal();
  }

  private saveLocal(): void {
    try {
      localStorage.setItem(LeaderboardManager.STORAGE_KEY, JSON.stringify(this.localEntries));
    } catch { /* ignore */ }
  }

  private loadLocal(): void {
    try {
      const data = localStorage.getItem(LeaderboardManager.STORAGE_KEY);
      if (data) this.localEntries = JSON.parse(data);
    } catch { /* ignore */ }
    this.loadFriends();
  }

  private saveFriends(): void {
    try {
      localStorage.setItem('snake_friends', JSON.stringify(this.friendsList));
    } catch { /* ignore */ }
  }

  private loadFriends(): void {
    try {
      const data = localStorage.getItem('snake_friends');
      if (data) this.friendsList = JSON.parse(data);
    } catch { /* ignore */ }
  }
}
