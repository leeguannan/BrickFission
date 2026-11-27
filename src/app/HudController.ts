/**
 * 《碎砖大裂变》(Brick Fission) — DOM HUD 控制器
 *
 * 集中管理顶部栏、技能列、底栏 select 与结算弹窗的全部 DOM 访问，
 * `main.ts` 只面对语义方法。遵守 docs/04 红线：
 * 游戏 UI 禁止动态代码执行与字符串注入式 DOM 写入，弹窗按钮一律 createElement。
 */
import { PADDLE_SKIN_IDS } from '../game/render/SkinRegistry.js';

export interface HudCallbacks {
  onSpeedCycle(): void;
  onRestart(): void;
  onPauseToggle(): void;
  onSoundToggle(): void;
  onMultiLaunch(): void;
  onTripleSplit(): void;
  onLevelChange(index: number): void;
  onSkinChange(skinId: string): void;
  onShopOpen(): void;
}

export interface ModalAction {
  label: string;
  primary?: boolean;
  onClick(): void;
}

/** 皮肤商店条目（`docs/04` §3.1 商业化循环 ③）。 */
export interface SkinShopEntry {
  id: string;
  name: string;
  price: number;
  unlocked: boolean;
  equipped: boolean;
  canTrial: boolean;
}

export interface SkinShopActions {
  onUnlock(skinId: string): void;
  onTrial(skinId: string): void;
  onEquip(skinId: string): void;
  onClose(): void;
}

export class HudController {
  private readonly btnSpeed: HTMLButtonElement;
  private readonly btnRestart: HTMLButtonElement;
  private readonly btnSound: HTMLButtonElement;
  private readonly btnPause: HTMLButtonElement;
  /** 暂停标签上次写入值，用于跳过无变化的 DOM 写入。 */
  private lastPaused: boolean | null = null;
  /** 脏值缓存：技能库存与金币数未变化时不触碰 DOM（每帧同步场景）。 */
  private lastBlueCount: number | null = null;
  private lastOrangeCount: number | null = null;
  private lastCoins: number | null = null;
  private readonly levelNo: HTMLElement;
  private readonly btnBlue: HTMLButtonElement;
  private readonly btnOrange: HTMLButtonElement;
  private readonly blueCount: HTMLElement;
  private readonly orangeCount: HTMLElement;
  private readonly levelSelect: HTMLSelectElement;
  private readonly skinSelect: HTMLSelectElement;
  private readonly coinCount: HTMLElement;
  private readonly btnShop: HTMLButtonElement;
  private readonly modalMask: HTMLElement;
  private readonly modalTitle: HTMLElement;
  private readonly modalBody: HTMLElement;
  private readonly modalActions: HTMLElement;
  private readonly shopPanel: HTMLElement;

  constructor(callbacks: HudCallbacks) {
    const $ = <T extends HTMLElement>(id: string): T => {
      const el = document.getElementById(id);
      if (!el) throw new Error(`HUD 缺少必需元素 #${id}`);
      return el as T;
    };

    this.btnSpeed = $<HTMLButtonElement>('btn-speed');
    this.btnRestart = $<HTMLButtonElement>('btn-restart');
    this.btnSound = $<HTMLButtonElement>('btn-sound');
    this.btnPause = $<HTMLButtonElement>('btn-pause');
    this.levelNo = $('level-no');
    this.btnBlue = $<HTMLButtonElement>('btn-skill-blue');
    this.btnOrange = $<HTMLButtonElement>('btn-skill-orange');
    this.blueCount = $('skill-blue-count');
    this.orangeCount = $('skill-orange-count');
    this.levelSelect = $<HTMLSelectElement>('level-select');
    this.skinSelect = $<HTMLSelectElement>('skin-select');
    this.coinCount = $('coin-count');
    this.btnShop = $<HTMLButtonElement>('btn-shop');
    this.modalMask = $('modal-mask');
    this.modalTitle = $('modal-title');
    this.modalBody = $('modal-body');
    this.modalActions = $('modal-actions');
    this.shopPanel = $('shop-panel');

    this.btnSpeed.addEventListener('click', callbacks.onSpeedCycle);
    this.btnRestart.addEventListener('click', callbacks.onRestart);
    this.btnPause.addEventListener('click', callbacks.onPauseToggle);
    this.btnSound.addEventListener('click', callbacks.onSoundToggle);
    this.btnBlue.addEventListener('click', callbacks.onMultiLaunch);
    this.btnOrange.addEventListener('click', callbacks.onTripleSplit);
    this.levelSelect.addEventListener('change', () => {
      callbacks.onLevelChange(this.levelSelect.selectedIndex);
    });
    this.skinSelect.addEventListener('change', () => {
      callbacks.onSkinChange(this.skinSelect.value);
    });
    this.btnShop.addEventListener('click', () => callbacks.onShopOpen());
  }

  /**
   * 填充选关下拉（不触发 change 事件）。
   *
   * @param unlockedCount 已解锁关卡数（1-based 语义：unlockedLevel = N 表示前 N 关可玩）。
   */
  fillLevelSelect(names: readonly string[], selectedIndex: number, unlockedCount = names.length): void {
    this.levelSelect.replaceChildren();
    names.forEach((name, i) => {
      const opt = document.createElement('option');
      opt.value = String(i);
      const locked = i >= unlockedCount;
      opt.textContent = locked
        ? `${String(i + 1).padStart(2, '0')} · 🔒 ${name}`
        : `${String(i + 1).padStart(2, '0')} · ${name}`;
      opt.disabled = locked;
      this.levelSelect.appendChild(opt);
    });
    this.levelSelect.selectedIndex = selectedIndex;
  }

  /**
   * 填充皮肤下拉。
   *
   * @param unlockedSkins 已解锁皮肤 ID 列表；未解锁项显示 🔒 并禁用（引导玩家去商店）。
   */
  fillSkinSelect(
    labels: Readonly<Record<string, string>>,
    selectedId: string,
    unlockedSkins: readonly string[] = PADDLE_SKIN_IDS,
  ): void {
    this.skinSelect.replaceChildren();
    for (const id of PADDLE_SKIN_IDS) {
      const opt = document.createElement('option');
      opt.value = id;
      const locked = !unlockedSkins.includes(id);
      opt.textContent = locked ? `🔒 ${labels[id] ?? id}` : (labels[id] ?? id);
      opt.disabled = locked;
      this.skinSelect.appendChild(opt);
    }
    this.skinSelect.value = selectedId;
  }

  setLevelNo(no: number): void {
    this.levelNo.textContent = String(no).padStart(2, '0');
  }

  setSpeedLabel(multiplier: 1 | 2 | 3): void {
    this.btnSpeed.textContent = `${multiplier}x`;
  }

  setPausedLabel(paused: boolean): void {
    // 每帧同步时避免重复写 DOM（文本未变则不触碰）。
    if (this.lastPaused === paused) return;
    this.lastPaused = paused;
    this.btnPause.textContent = paused ? '▶' : '||';
  }

  setSoundLabel(muted: boolean): void {
    this.btnSound.textContent = muted ? '♪̸' : '♪';
  }

  setSkillCounts(blue: number, orange: number): void {
    // 每帧同步时避免重复写 DOM（数值未变则不触碰）。
    if (this.lastBlueCount === blue && this.lastOrangeCount === orange) return;
    this.lastBlueCount = blue;
    this.lastOrangeCount = orange;
    this.blueCount.textContent = String(blue);
    this.orangeCount.textContent = String(orange);
    // 库存为 0 时**不禁用**按钮：点击将进入「观看激励补给」流程（docs/04 §3.1 商业化循环 ②）。
    this.btnBlue.classList.toggle('empty', blue <= 0);
    this.btnOrange.classList.toggle('empty', orange <= 0);
  }

  /** 金币数（`docs/04` §3.1：解锁皮肤与过关奖励使用）。 */
  setCoins(coins: number): void {
    const value = Math.max(0, Math.floor(coins));
    if (this.lastCoins === value) return;
    this.lastCoins = value;
    this.coinCount.textContent = String(value);
  }

  /** 显示结算/提示弹窗。 */
  showModal(title: string, body: string, actions: readonly ModalAction[]): void {
    this.modalTitle.textContent = title;
    this.modalBody.textContent = body;
    this.modalActions.replaceChildren();
    for (const action of actions) {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = action.primary ? 'modal-btn primary' : 'modal-btn';
      btn.textContent = action.label;
      btn.addEventListener('click', () => {
        this.hideModal();
        action.onClick();
      });
      this.modalActions.appendChild(btn);
    }
    this.modalMask.classList.remove('hidden');
  }

  hideModal(): void {
    this.modalMask.classList.add('hidden');
  }

  get isModalVisible(): boolean {
    return !this.modalMask.classList.contains('hidden');
  }

  /**
   * 显示皮肤商店（`docs/04` §3.1 商业化循环 ③）。
   *
   * 规则：
   *   - 已解锁 → 直接装备；
   *   - 未解锁且金币足够 → 金币解锁（扣币后永久拥有）；
   *   - 未解锁且金币不足 → 可观看激励广告免费试用 1 局（试用不写入存档）。
   */
  showSkinShop(entries: readonly SkinShopEntry[], actions: SkinShopActions): void {
    const list = document.createElement('div');
    list.className = 'shop-list';
    for (const entry of entries) {
      const row = document.createElement('div');
      row.className = 'shop-row';

      const name = document.createElement('span');
      name.className = 'shop-name';
      name.textContent = entry.name;
      row.appendChild(name);

      const price = document.createElement('span');
      price.className = 'shop-price';
      price.textContent = entry.unlocked
        ? (entry.equipped ? '已装备' : '已解锁')
        : `${entry.price} 金币`;
      row.appendChild(price);

      if (entry.unlocked) {
        const equip = document.createElement('button');
        equip.type = 'button';
        equip.className = entry.equipped ? 'shop-btn disabled' : 'shop-btn';
        equip.textContent = entry.equipped ? '使用中' : '装备';
        equip.addEventListener('click', () => {
          this.hideSkinShop();
          actions.onEquip(entry.id);
        });
        row.appendChild(equip);
      } else {
        const unlock = document.createElement('button');
        unlock.type = 'button';
        unlock.className = 'shop-btn';
        unlock.textContent = `解锁 ${entry.price}`;
        unlock.addEventListener('click', () => {
          this.hideSkinShop();
          actions.onUnlock(entry.id);
        });
        row.appendChild(unlock);

        if (entry.canTrial) {
          const trial = document.createElement('button');
          trial.type = 'button';
          trial.className = 'shop-btn ghost';
          trial.textContent = '看激励试用';
          trial.addEventListener('click', () => {
            this.hideSkinShop();
            actions.onTrial(entry.id);
          });
          row.appendChild(trial);
        }
      }
      list.appendChild(row);
    }

    const close = document.createElement('button');
    close.type = 'button';
    close.className = 'shop-btn ghost';
    close.textContent = '关闭';
    close.addEventListener('click', () => {
      this.hideSkinShop();
      actions.onClose();
    });

    this.shopPanel.replaceChildren(list, close);
    this.shopPanel.classList.remove('hidden');
  }

  hideSkinShop(): void {
    this.shopPanel.classList.add('hidden');
  }

  get isShopVisible(): boolean {
    return !this.shopPanel.classList.contains('hidden');
  }
}
