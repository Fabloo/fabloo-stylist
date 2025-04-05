declare global {
    interface Window {
      fbq: (...args: any[]) => void;
    }
  }
  