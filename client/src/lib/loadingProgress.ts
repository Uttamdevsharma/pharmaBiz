// Global loading progress bar controller bridging directly to NProgress / NextTopLoader
import NProgress from "nprogress";

type ProgressListener = (state: { active: boolean; progress: number }) => void;

class LoadingProgressManager {
  private activeCount = 0;
  private isConfigured = false;
  private listeners: Set<ProgressListener> = new Set();

  private ensureConfigured() {
    if (!this.isConfigured && typeof window !== "undefined") {
      NProgress.configure({
        showSpinner: false,
        trickleSpeed: 200,
        minimum: 0.08,
        easing: "ease",
        speed: 200,
      });
      this.isConfigured = true;
    }
  }

  public subscribe(listener: ProgressListener) {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  public start() {
    this.ensureConfigured();
    this.activeCount++;
    if (this.activeCount === 1) {
      if (typeof window !== "undefined") {
        NProgress.start();
      }
    }
  }

  public done(force = false) {
    this.ensureConfigured();
    if (force) {
      this.activeCount = 0;
      if (typeof window !== "undefined") {
        NProgress.done();
      }
      return;
    }

    if (this.activeCount > 0) {
      this.activeCount--;
    }

    if (this.activeCount <= 0) {
      this.activeCount = 0;
      if (typeof window !== "undefined") {
        NProgress.done();
      }
    }
  }

  // Quick sweep for instant tab/menu navigations
  public triggerQuick(durationMs = 260) {
    this.start();
    setTimeout(() => {
      this.done();
    }, durationMs);
  }
}

export const loadingProgress = new LoadingProgressManager();

