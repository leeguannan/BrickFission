/**
 * 《碎砖大裂变》(Brick Fission) — DOM HUD 控制器
 *
 * 集中管理顶部栏、技能列、底栏 select 与结算弹窗的全部 DOM 访问，
 * `main.ts` 只面对语义方法。遵守 docs/04 红线：
 * 游戏 UI 禁止 eval / new Function / innerHTML，弹窗按钮一律 createElement。
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
}

export interface ModalAction {
  label: string;
  primary?: boolean;
  onClick(): void;
}

export class HudController {
  private readonly btnSpeed: HTMLButtonElement;
  private readonly btnRestart: HTMLButtonElement;
  private readonly btnSound: HTMLButtonElement;
  private readonly btnPause: HTMLButtonElement;
  /** 暂停标签上次写入值，用于跳过无变化的 DOM 写入。 */
  private lastPaused: boolean | null = null;
  private readonly levelNo: HTMLElement;
  private readonly btnBlue: HTMLButtonElement;
  private readonly btnOrange: HTMLButtonElement;
  private readonly blueCount: HTMLElement;
  private readonly orangeCount: HTMLElement;
  private readonly levelSelect: HTMLSelectElement;
  private readonly skinSelect: HTMLSelectElement;
  private readonly modalMask: HTMLElement;
  private readonly modalTitle: HTMLElement;
  private readonly modalBody: HTMLElement;
  private readonly modalActions: HTMLElement;

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
    this.modalMask = $('modal-mask');
    this.modalTitle = $('modal-title');
    this.modalBody = $('modal-body');
    this.modalActions = $('modal-actions');

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
  }

  /** 填充选关下拉（不触发 change 事件）。 */
  fillLevelSelect(names: readonly string[], selectedIndex: number): void {
    this.levelSelect.replaceChildren();
    names.forEach((name, i) => {
      const opt = document.createElement('option');
      opt.value = String(i);
      opt.textContent = `${String(i + 1).padStart(2, '0')} · ${name}`;
      this.levelSelect.appendChild(opt);
    });
    this.levelSelect.selectedIndex = selectedIndex;
  }

  /** 填充皮肤下拉。 */
  fillSkinSelect(labels: Readonly<Record<string, string>>, selectedId: string): void {
    this.skinSelect.replaceChildren();
    for (const id of PADDLE_SKIN_IDS) {
      const opt = document.createElement('option');
      opt.value = id;
      opt.textContent = labels[id] ?? id;
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
    this.blueCount.textContent = String(blue);
    this.orangeCount.textContent = String(orange);
    this.btnBlue.disabled = blue <= 0;
    this.btnOrange.disabled = orange <= 0;
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
}
