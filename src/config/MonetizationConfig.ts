// 广告位配置
export interface AdSlot {
  id: string;
  type: 'banner' | 'interstitial' | 'rewarded';
  placement: string;
  refreshInterval?: number; // 秒
}

export const AD_SLOTS: AdSlot[] = [
  { id: 'banner_bottom', type: 'banner', placement: '底部横幅', refreshInterval: 30 },
  { id: 'interstitial_gameover', type: 'interstitial', placement: '游戏结束插屏' },
  { id: 'rewarded_revive', type: 'rewarded', placement: '观看广告复活' },
  { id: 'rewarded_double', type: 'rewarded', placement: '观看广告双倍积分' },
  { id: 'rewarded_coins', type: 'rewarded', placement: '观看广告获取金币' },
];

// 内购商品
export interface IAPProduct {
  id: string;
  name: string;
  description: string;
  price: number; // 人民币（元）
  coins?: number; // 获得的金币数
  type: 'consumable' | 'non_consumable' | 'subscription';
}

export const IAP_PRODUCTS: IAPProduct[] = [
  { id: 'coins_100', name: '100金币', description: '购买100金币', price: 6, coins: 100, type: 'consumable' },
  { id: 'coins_500', name: '500金币', description: '购买500金币（赠送50）', price: 25, coins: 550, type: 'consumable' },
  { id: 'coins_1200', name: '1200金币', description: '购买1200金币（赠送200）', price: 50, coins: 1400, type: 'consumable' },
  { id: 'remove_ads', name: '去除广告', description: '永久移除所有广告', price: 12, type: 'non_consumable' },
  { id: 'vip_monthly', name: 'VIP月卡', description: '每日领取20金币+去广告', price: 18, type: 'subscription' },
];

// 皮肤配置
export interface SkinConfig {
  id: string;
  name: string;
  description: string;
  price: number; // 金币
  headColor: string;
  bodyColor: string;
  pattern?: 'solid' | 'striped' | 'gradient' | 'neon' | 'pixel';
  unlockCondition?: string;
}

export const SKINS: SkinConfig[] = [
  { id: 'default', name: '经典绿', description: '默认皮肤', price: 0, headColor: '#2d5a1e', bodyColor: '#4caf50', pattern: 'solid' },
  { id: 'fire', name: '烈焰红', description: '燃烧的蛇', price: 50, headColor: '#b71c1c', bodyColor: '#ff5722', pattern: 'gradient' },
  { id: 'ocean', name: '深海蓝', description: '海洋之蛇', price: 50, headColor: '#0d47a1', bodyColor: '#2196f3', pattern: 'gradient' },
  { id: 'gold', name: '黄金蛇', description: '闪闪发光', price: 100, headColor: '#f57f17', bodyColor: '#ffd600', pattern: 'neon' },
  { id: 'neon', name: '霓虹紫', description: '赛博朋克风格', price: 100, headColor: '#9c27b0', bodyColor: '#e040fb', pattern: 'neon' },
  { id: 'pixel', name: '像素风', description: '复古像素风格', price: 80, headColor: '#333333', bodyColor: '#666666', pattern: 'pixel' },
  { id: 'rainbow', name: '彩虹蛇', description: '七彩变幻', price: 200, headColor: '#ff0000', bodyColor: '#ff9800', pattern: 'striped' },
  { id: 'ghost', name: '幽灵蛇', description: '半透明幽灵效果', price: 150, headColor: '#b0bec5', bodyColor: '#cfd8dc', pattern: 'solid' },
  { id: 'dragon', name: '神龙', description: '传说级皮肤', price: 500, headColor: '#ff1744', bodyColor: '#d50000', pattern: 'neon', unlockCondition: '达成10个成就' },
  { id: 'cosmic', name: '星际蛇', description: '来自宇宙深处', price: 300, headColor: '#1a237e', bodyColor: '#304ffe', pattern: 'gradient' },
];

// 道具配置
export interface ItemConfig {
  id: string;
  name: string;
  description: string;
  price: number; // 金币
  type: 'consumable' | 'permanent';
  maxStack?: number;
}

export const ITEMS: ItemConfig[] = [
  { id: 'revive', name: '复活卷轴', description: '死亡后原地复活', price: 30, type: 'consumable', maxStack: 5 },
  { id: 'magnet', name: '磁铁', description: '自动吸引附近食物（15秒）', price: 20, type: 'consumable', maxStack: 10 },
  { id: 'shield', name: '护盾', description: '免疫一次碰撞', price: 25, type: 'consumable', maxStack: 5 },
  { id: 'slow_time', name: '时间减速', description: '减速50%持续10秒', price: 15, type: 'consumable', maxStack: 10 },
  { id: 'double_score', name: '双倍积分', description: '双倍积分持续30秒', price: 20, type: 'consumable', maxStack: 10 },
  { id: 'shrink', name: '缩身术', description: '蛇身缩短一半', price: 40, type: 'consumable', maxStack: 3 },
];
