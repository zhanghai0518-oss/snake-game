import { SKINS, ITEMS, SkinConfig, ItemConfig } from '../config/MonetizationConfig';

export interface PlayerInventory {
  coins: number;
  ownedSkins: string[];
  equippedSkin: string;
  items: Record<string, number>; // itemId -> count
}

export class ShopSystem {
  private static STORAGE_KEY = 'snake_shop';
  private inventory: PlayerInventory;

  constructor() {
    this.inventory = this.load();
  }

  getCoins(): number { return this.inventory.coins; }

  addCoins(amount: number): void {
    this.inventory.coins += amount;
    this.save();
  }

  spendCoins(amount: number): boolean {
    if (this.inventory.coins < amount) return false;
    this.inventory.coins -= amount;
    this.save();
    return true;
  }

  // 皮肤
  buySkin(skinId: string): boolean {
    const skin = SKINS.find(s => s.id === skinId);
    if (!skin) return false;
    if (this.inventory.ownedSkins.includes(skinId)) return false;
    if (!this.spendCoins(skin.price)) return false;
    this.inventory.ownedSkins.push(skinId);
    this.save();
    return true;
  }

  equipSkin(skinId: string): boolean {
    if (!this.inventory.ownedSkins.includes(skinId)) return false;
    this.inventory.equippedSkin = skinId;
    this.save();
    return true;
  }

  getEquippedSkin(): SkinConfig {
    return SKINS.find(s => s.id === this.inventory.equippedSkin) ?? SKINS[0];
  }

  getOwnedSkins(): string[] { return [...this.inventory.ownedSkins]; }
  getOwnedSkinCount(): number { return this.inventory.ownedSkins.length; }

  isSkinOwned(skinId: string): boolean {
    return this.inventory.ownedSkins.includes(skinId);
  }

  // 道具
  buyItem(itemId: string): boolean {
    const item = ITEMS.find(i => i.id === itemId);
    if (!item) return false;
    const current = this.inventory.items[itemId] ?? 0;
    if (item.maxStack !== undefined && current >= item.maxStack) return false;
    if (!this.spendCoins(item.price)) return false;
    this.inventory.items[itemId] = current + 1;
    this.save();
    return true;
  }

  useItem(itemId: string): boolean {
    const count = this.inventory.items[itemId] ?? 0;
    if (count <= 0) return false;
    this.inventory.items[itemId] = count - 1;
    this.save();
    return true;
  }

  getItemCount(itemId: string): number {
    return this.inventory.items[itemId] ?? 0;
  }

  getItemConfig(itemId: string): ItemConfig | undefined {
    return ITEMS.find(i => i.id === itemId);
  }

  getAllSkins(): SkinConfig[] { return [...SKINS]; }
  getAllItems(): ItemConfig[] { return [...ITEMS]; }
  getInventory(): PlayerInventory { return { ...this.inventory, ownedSkins: [...this.inventory.ownedSkins], items: { ...this.inventory.items } }; }

  private save(): void {
    try {
      localStorage.setItem(ShopSystem.STORAGE_KEY, JSON.stringify(this.inventory));
    } catch { /* ignore */ }
  }

  private load(): PlayerInventory {
    try {
      const raw = localStorage.getItem(ShopSystem.STORAGE_KEY);
      if (raw) return JSON.parse(raw);
    } catch { /* ignore */ }
    return { coins: 0, ownedSkins: ['default'], equippedSkin: 'default', items: {} };
  }
}
