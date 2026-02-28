/**
 * 皮肤选择界面 - 展示所有皮肤，支持选择和预览
 */

import { SkinManager, SkinDefinition } from '../game/SkinManager';

export class SkinSelector {
  private container: HTMLDivElement;
  private skinManager: SkinManager;
  private visible: boolean = false;
  private onSelect: ((skinId: string) => void) | null = null;

  constructor(skinManager: SkinManager, parentEl: HTMLElement) {
    this.skinManager = skinManager;
    this.container = document.createElement('div');
    this.container.className = 'skin-selector-overlay';
    this.applyOverlayStyles();
    this.container.style.display = 'none';
    parentEl.appendChild(this.container);

    // 点击背景关闭
    this.container.addEventListener('click', (e) => {
      if (e.target === this.container) this.hide();
    });
  }

  /** 设置选择回调 */
  setOnSelect(cb: (skinId: string) => void): void {
    this.onSelect = cb;
  }

  /** 显示选择界面 */
  show(): void {
    this.visible = true;
    this.container.style.display = 'flex';
    this.render();
  }

  /** 隐藏选择界面 */
  hide(): void {
    this.visible = false;
    this.container.style.display = 'none';
  }

  toggle(): void {
    this.visible ? this.hide() : this.show();
  }

  isVisible(): boolean {
    return this.visible;
  }

  private render(): void {
    const skins = this.skinManager.getAllSkins();
    const selected = this.skinManager.getSelectedSkin();

    this.container.innerHTML = `
      <div class="skin-selector-panel" style="${this.panelStyles()}">
        <h2 style="margin:0 0 16px;color:#fff;text-align:center;font-size:22px;">🎨 选择皮肤</h2>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">
          ${skins.map(s => this.renderCard(s, selected.id)).join('')}
        </div>
        <button class="skin-close-btn" style="${this.closeBtnStyles()}">关闭</button>
      </div>
    `;

    // 绑定事件
    this.container.querySelector('.skin-close-btn')?.addEventListener('click', () => this.hide());
    this.container.querySelectorAll('.skin-card').forEach(card => {
      card.addEventListener('click', () => {
        const id = (card as HTMLElement).dataset['skinId'];
        if (id && this.skinManager.isUnlocked(id)) {
          this.skinManager.selectSkin(id);
          this.onSelect?.(id);
          this.render();
        }
      });
    });
  }

  private renderCard(skin: SkinDefinition, selectedId: string): string {
    const unlocked = this.skinManager.isUnlocked(skin.id);
    const isSelected = skin.id === selectedId;
    const border = isSelected ? '2px solid #ffd700' : '2px solid transparent';
    const opacity = unlocked ? '1' : '0.5';
    const cursor = unlocked ? 'pointer' : 'not-allowed';
    const lockIcon = unlocked ? '' : '🔒 ';

    return `
      <div class="skin-card" data-skin-id="${skin.id}" style="
        background:rgba(255,255,255,0.08);
        border-radius:10px;
        padding:12px;
        border:${border};
        opacity:${opacity};
        cursor:${cursor};
        transition:all 0.2s;
      ">
        <div style="display:flex;align-items:center;gap:8px;margin-bottom:6px;">
          <div style="width:24px;height:24px;border-radius:50%;background:${skin.colors.headCenter};box-shadow:0 0 6px ${skin.effect.glowColor ?? 'transparent'};"></div>
          <span style="color:#fff;font-weight:bold;font-size:14px;">${lockIcon}${skin.name}</span>
          ${isSelected ? '<span style="color:#ffd700;font-size:12px;">✓ 使用中</span>' : ''}
        </div>
        <p style="color:#aaa;font-size:12px;margin:0 0 4px;">${skin.description}</p>
        ${!unlocked ? `<p style="color:#ff9800;font-size:11px;margin:0;">🏆 达到 ${skin.unlockScore} 分解锁</p>` : ''}
        <div style="display:flex;gap:4px;margin-top:6px;">
          ${this.renderColorBar(skin)}
        </div>
      </div>
    `;
  }

  private renderColorBar(skin: SkinDefinition): string {
    const colors = [skin.colors.headCenter, skin.colors.headEdge, skin.colors.bodyStart, skin.colors.bodyEnd];
    return colors.map(c =>
      `<div style="width:16px;height:8px;border-radius:2px;background:${c};"></div>`
    ).join('');
  }

  private applyOverlayStyles(): void {
    Object.assign(this.container.style, {
      position: 'fixed',
      top: '0', left: '0', right: '0', bottom: '0',
      background: 'rgba(0,0,0,0.7)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: '1000',
    });
  }

  private panelStyles(): string {
    return 'background:#1a1a2e;border-radius:16px;padding:24px;max-width:420px;width:90%;max-height:80vh;overflow-y:auto;';
  }

  private closeBtnStyles(): string {
    return 'display:block;margin:16px auto 0;padding:8px 32px;background:#333;color:#fff;border:none;border-radius:8px;cursor:pointer;font-size:14px;';
  }
}
