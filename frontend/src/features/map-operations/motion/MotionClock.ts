/**
 * MotionClock — Central RequestAnimationFrame & Visibility Timing Service (V15C)
 *
 * Rules:
 * - EXACTLY ONE master animation frame loop across the operational map
 * - Automatic pause/reconciliation on browser tab hidden / visible
 * - No huge accumulated delta timestamps when returning from background
 * - Unsubscribe cleanup guarantees zero memory or listener leaks
 */

export type FrameListener = (deltaMs: number, elapsedMs: number) => void;

export class MotionClock {
  private static instance: MotionClock | null = null;

  private listeners = new Set<FrameListener>();
  private rafId: number | null = null;
  private lastTimestamp: number | null = null;
  private elapsedMs: number = 0;
  private running: boolean = false;
  private isDocumentHidden: boolean = false;
  private visibilityHandler: (() => void) | null = null;

  private constructor() {
    this.setupVisibilityListener();
  }

  public static getInstance(): MotionClock {
    if (!MotionClock.instance) {
      MotionClock.instance = new MotionClock();
    }
    return MotionClock.instance;
  }

  /**
   * Resets the singleton instance (primarily for testing and clean teardown).
   */
  public static resetInstance(): void {
    if (MotionClock.instance) {
      MotionClock.instance.destroy();
      MotionClock.instance = null;
    }
  }

  private setupVisibilityListener(): void {
    if (typeof document !== 'undefined') {
      this.isDocumentHidden = document.visibilityState === 'hidden';
      this.visibilityHandler = () => {
        const hidden = document.visibilityState === 'hidden';
        this.isDocumentHidden = hidden;
        if (hidden) {
          this.pause();
        } else {
          // Reset lastTimestamp to prevent delta explosion on tab return
          this.lastTimestamp = null;
          if (this.listeners.size > 0) {
            this.resume();
          }
        }
      };
      document.addEventListener('visibilitychange', this.visibilityHandler);
    }
  }

  /**
   * Subscribes a listener callback to frame ticks.
   * Automatically starts the clock if this is the first listener.
   */
  public subscribe(listener: FrameListener): () => void {
    this.listeners.add(listener);
    if (this.listeners.size === 1 && !this.isDocumentHidden) {
      this.start();
    }

    return () => {
      this.listeners.delete(listener);
      if (this.listeners.size === 0) {
        this.pause();
      }
    };
  }

  public start(): void {
    if (this.running) return;
    this.running = true;
    this.lastTimestamp = null;
    this.scheduleNextFrame();
  }

  public pause(): void {
    this.running = false;
    if (this.rafId !== null) {
      if (typeof cancelAnimationFrame === 'function') {
        cancelAnimationFrame(this.rafId);
      }
      this.rafId = null;
    }
    this.lastTimestamp = null;
  }

  public resume(): void {
    if (this.running || this.isDocumentHidden) return;
    this.running = true;
    this.lastTimestamp = null;
    this.scheduleNextFrame();
  }

  public isRunning(): boolean {
    return this.running;
  }

  public getElapsedMs(): number {
    return this.elapsedMs;
  }

  public getListenerCount(): number {
    return this.listeners.size;
  }

  /**
   * Manual single tick step (for deterministic headless unit testing).
   */
  public manualTick(deltaMs: number): void {
    this.elapsedMs += deltaMs;
    for (const listener of Array.from(this.listeners)) {
      listener(deltaMs, this.elapsedMs);
    }
  }

  private scheduleNextFrame(): void {
    if (!this.running) return;

    if (typeof requestAnimationFrame === 'function') {
      this.rafId = requestAnimationFrame(this.onFrame);
    }
  }

  private onFrame = (timestamp: number): void => {
    if (!this.running) return;

    if (this.lastTimestamp === null) {
      this.lastTimestamp = timestamp;
      this.scheduleNextFrame();
      return;
    }

    // Clamp deltaMs between 0 and 100ms to safeguard against tab lags / pauses
    const rawDelta = timestamp - this.lastTimestamp;
    const deltaMs = Math.max(0, Math.min(100, rawDelta));
    this.lastTimestamp = timestamp;
    this.elapsedMs += deltaMs;

    // Dispatch to frame listeners
    for (const listener of Array.from(this.listeners)) {
      listener(deltaMs, this.elapsedMs);
    }

    this.scheduleNextFrame();
  };

  public destroy(): void {
    this.pause();
    this.listeners.clear();
    if (typeof document !== 'undefined' && this.visibilityHandler) {
      document.removeEventListener('visibilitychange', this.visibilityHandler);
      this.visibilityHandler = null;
    }
  }
}
