export class ScoreManager {
  current: number = 0;
  high: number = 0;

  constructor() {
    this.loadHigh();
  }

  add(points: number): void {
    this.current += points;
    if (this.current > this.high) {
      this.high = this.current;
    }
  }

  reset(): void { this.current = 0; }

  saveHigh(): void {
    try { localStorage.setItem('snake_high_score', String(this.high)); } catch {}
  }

  private loadHigh(): void {
    try { this.high = parseInt(localStorage.getItem('snake_high_score') || '0'); } catch {}
  }
}
