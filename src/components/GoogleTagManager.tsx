import { useEffect } from 'react';

declare global {
  interface Window {
    dataLayer: any[];
    gtag: (...args: any[]) => void;
  }
}

export function GoogleTagManager() {
  useEffect(() => {
    // Create script for gtag
    const gtagScript = document.createElement('script');
    gtagScript.async = true;
    gtagScript.src = 'https://www.googletagmanager.com/gtag/js?id=AW-16913245095';
    document.head.appendChild(gtagScript);

    // Initialize dataLayer and gtag function
    window.dataLayer = window.dataLayer || [];
    function gtag(...args: any[]) {
      window.dataLayer.push(arguments);
    }
    window.gtag = gtag;

    // Basic gtag setup
    gtag('js', new Date());
    gtag('config', 'AW-16913245095');

    // Cleanup
    return () => {
      document.head.removeChild(gtagScript);
    };
  }, []);

  return null;
} 