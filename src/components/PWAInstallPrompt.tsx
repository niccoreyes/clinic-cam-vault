import React, { useEffect, useState } from 'react';

const PWAInstallPrompt: React.FC = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showPrompt, setShowPrompt] = useState(false);
  const [isIOS, setIsIOS] = useState(false);

  useEffect(() => {
    const handler = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShowPrompt(true);
    };

    window.addEventListener('beforeinstallprompt', handler as EventListener);

    // Detect iOS standalone support
    const ua = window.navigator.userAgent.toLowerCase();
    const isiOS = /iphone|ipad|ipod/.test(ua) && !/windows/.test(ua);
    setIsIOS(isiOS);

    return () => {
      window.removeEventListener('beforeinstallprompt', handler as EventListener);
    };
  }, []);

  const onInstallClick = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const choice = await deferredPrompt.userChoice;
      setShowPrompt(false);
      setDeferredPrompt(null);
      console.log('User choice', choice);
    }
  };

  if (!showPrompt && !isIOS) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 p-4 bg-white border rounded shadow-lg max-w-sm">
      {isIOS ? (
        <div>
          <h4 className="font-semibold">Install MedRecorder</h4>
          <p className="text-sm">Tap the Share button in Safari and choose "Add to Home Screen" to install.</p>
        </div>
      ) : (
        <div>
          <h4 className="font-semibold">Install MedRecorder</h4>
          <p className="text-sm">Install this app to your device for a better experience.</p>
          <div className="mt-2 flex gap-2">
            <button className="px-3 py-1 bg-blue-500 text-white rounded" onClick={onInstallClick}>Install</button>
            <button className="px-3 py-1 bg-gray-200 rounded" onClick={() => setShowPrompt(false)}>Dismiss</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default PWAInstallPrompt;
