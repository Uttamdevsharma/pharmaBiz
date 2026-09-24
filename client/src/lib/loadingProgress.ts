// Global loading progress bar controller bridging directly to NProgress / NextTopLoader
import NProgress from "nprogress";

type ProgressListener = (state: { active: boolean; progress: number }) => void;

class LoadingProgressManager {
  private activeCount = 0;
  private isConfigured = false;
  private crawlInterval: any = null;
  private listeners: Set<ProgressListener> = new Set();

  private ensureConfigured() {
    if (!this.isConfigured && typeof window !== "undefined") {
      NProgress.configure({
        showSpinner: false,
        trickleSpeed: 250,
        minimum: 0.12,
        easing: "ease",
        speed: 300,
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

  // Smooth crawling for page navigation: stays on current page while loader crawls smoothly
  public startSlowCrawl() {
    this.ensureConfigured();
    if (typeof window === "undefined") return;
    if (this.crawlInterval) {
      clearInterval(this.crawlInterval);
      this.crawlInterval = null;
    }
    this.activeCount = 1;
    NProgress.set(0.15);
    this.crawlInterval = setInterval(() => {
      if (NProgress.status && NProgress.status < 0.88) {
        NProgress.inc(0.04);
      }
    }, 180);
  }

  // Completes the crawl and smoothly zips to 100%
  public finishCrawl() {
    if (typeof window === "undefined") return;
    if (this.crawlInterval) {
      clearInterval(this.crawlInterval);
      this.crawlInterval = null;
    }
    this.activeCount = 0;
    NProgress.done(true);
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


