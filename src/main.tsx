import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

// Register service worker for offline functionality (production only)
if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js')
      .then((registration) => {
        console.log('SW registered: ', registration);
      })
      .catch((registrationError) => {
        console.log('SW registration failed: ', registrationError);
      });
  });
} else {
  // In development, skip SW to prevent caching/HMR conflicts and clean up any previous registrations
  if ('serviceWorker' in navigator && !import.meta.env.PROD) {
    navigator.serviceWorker.getRegistrations().then((regs) => {
      if (regs.length) console.log(`Unregistering ${regs.length} service worker(s) in development`);
      regs.forEach((r) => r.unregister());
    });
  }
}

createRoot(document.getElementById("root")!).render(<App />);
