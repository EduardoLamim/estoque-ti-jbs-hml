export const IDLE_MS = 10 * 60 * 1000;
export const expired = (lastActivity: number, now = Date.now()) => now - lastActivity >= IDLE_MS;
export class BadgeScanner {
  private buffer = '';
  private last = 0;
  push(key: string, time: number): string | null {
    if (time - this.last > 80) this.buffer = '';
    this.last = time;
    if (key === 'Enter') {
      const token = this.buffer;
      this.buffer = '';
      return /^[a-f0-9]{64}$/.test(token) ? token : null;
    }
    if (key.length === 1) this.buffer = (this.buffer + key).slice(-65);
    return null;
  }
}
