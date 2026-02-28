import { Direction } from './Snake';

type DirectionCallback = (dir: Direction) => void;
type ActionCallback = () => void;

export class InputManager {
  private dirCallbacks: DirectionCallback[] = [];
  private actionCallbacks: Map<string, ActionCallback[]> = new Map();
  private touchStartX: number = 0;
  private touchStartY: number = 0;

  constructor(canvas: HTMLCanvasElement) {
    this.setupKeyboard();
    this.setupTouch(canvas);
  }

  onDirection(cb: DirectionCallback): void { this.dirCallbacks.push(cb); }
  
  onAction(action: string, cb: ActionCallback): void {
    if (!this.actionCallbacks.has(action)) this.actionCallbacks.set(action, []);
    this.actionCallbacks.get(action)!.push(cb);
  }

  private emit(dir: Direction): void { this.dirCallbacks.forEach(cb => cb(dir)); }
  private emitAction(action: string): void { this.actionCallbacks.get(action)?.forEach(cb => cb()); }

  private setupKeyboard(): void {
    document.addEventListener('keydown', (e) => {
      switch (e.key) {
        case 'ArrowUp': case 'w': case 'W': this.emit(Direction.UP); break;
        case 'ArrowDown': case 's': case 'S': this.emit(Direction.DOWN); break;
        case 'ArrowLeft': case 'a': case 'A': this.emit(Direction.LEFT); break;
        case 'ArrowRight': case 'd': case 'D': this.emit(Direction.RIGHT); break;
        case ' ': case 'p': case 'P': this.emitAction('pause'); break;
        case 'r': case 'R': this.emitAction('restart'); break;
      }
      e.preventDefault();
    });
  }

  private setupTouch(canvas: HTMLCanvasElement): void {
    canvas.addEventListener('touchstart', (e) => {
      this.touchStartX = e.touches[0].clientX;
      this.touchStartY = e.touches[0].clientY;
      e.preventDefault();
    }, { passive: false });

    canvas.addEventListener('touchend', (e) => {
      const dx = e.changedTouches[0].clientX - this.touchStartX;
      const dy = e.changedTouches[0].clientY - this.touchStartY;
      const minSwipe = 30;
      
      if (Math.abs(dx) < minSwipe && Math.abs(dy) < minSwipe) return;
      
      if (Math.abs(dx) > Math.abs(dy)) {
        this.emit(dx > 0 ? Direction.RIGHT : Direction.LEFT);
      } else {
        this.emit(dy > 0 ? Direction.DOWN : Direction.UP);
      }
      e.preventDefault();
    }, { passive: false });
  }
}
