import React, { useState, useEffect } from "react";
import { User } from "firebase/auth";
import { WellBridgeLogo } from "./WellBridgeLogo";
import { Download, Smartphone } from "lucide-react";

interface AppHeaderProps {
  user: User | null;
  onSignOut: () => void;
}

export const AppHeader: React.FC<AppHeaderProps> = ({ user, onSignOut }) => {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    // Check if already in standalone PWA mode
    if (window.matchMedia("(display-mode: standalone)").matches || (window.navigator as any).standalone) {
      setIsInstalled(true);
    }

    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    const handleAppInstalled = () => {
      setIsInstalled(true);
      setDeferredPrompt(null);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    window.addEventListener("appinstalled", handleAppInstalled);

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
      window.removeEventListener("appinstalled", handleAppInstalled);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === "accepted") {
      setIsInstalled(true);
    }
    setDeferredPrompt(null);
  };

  return (
    <header className="min-h-16 h-auto bg-white/95 backdrop-blur-md flex items-center justify-between px-3 sm:px-8 py-2.5 flex-shrink-0 w-full">
      {/* Left: Logo and App Title */}
      <div className="flex items-center gap-2 sm:gap-3 min-w-0">
        <div className="w-9 h-9 sm:w-10 sm:h-10 flex items-center justify-center bg-teal-50 rounded-lg shrink-0 border border-teal-100/80">
          <WellBridgeLogo size={28} className="w-7 h-7 sm:w-8 sm:h-8" />
        </div>
        <div className="min-w-0">
          <div className="flex items-center gap-1.5 sm:gap-2">
            <h1 className="text-base sm:text-xl font-bold text-slate-900 leading-tight truncate">
              WellBridge AI
            </h1>
            <span className="hidden md:inline-block text-[10px] font-bold uppercase tracking-wider bg-teal-50 text-teal-700 border border-teal-200 px-2 py-0.5 rounded-full shrink-0">
              Patient Journal
            </span>
          </div>
          <p className="hidden sm:block text-[10px] text-slate-400 italic truncate">
            Bridging Confusing Medical Reports to Everyday Life
          </p>
        </div>
      </div>

      {/* Right: Install PWA button & User Section */}
      <div className="flex items-center gap-2 sm:gap-4 shrink-0">
        {/* PWA Install Button (If browser supports prompt) */}
        {!isInstalled && deferredPrompt && (
          <button
            onClick={handleInstallClick}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-teal-50 hover:bg-teal-100 text-teal-800 border border-teal-200 rounded-xl text-xs font-semibold shadow-2xs transition cursor-pointer"
            title="Install WellBridge AI to your home screen"
          >
            <Smartphone className="w-3.5 h-3.5 text-teal-600" />
            <span className="hidden sm:inline">Install App</span>
            <span className="sm:hidden">Install</span>
          </button>
        )}

        {user && (
          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            <div className="text-right">
              <p className="text-xs sm:text-sm font-medium text-slate-700 max-w-[100px] sm:max-w-[180px] truncate">
                {user.displayName || "Patient"}
              </p>
              <button
                id="header-signout-btn"
                onClick={onSignOut}
                className="text-[11px] sm:text-xs text-slate-500 hover:text-red-500 transition-colors cursor-pointer"
              >
                Sign Out
              </button>
            </div>
            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-teal-100 border-2 border-white shadow-xs overflow-hidden flex items-center justify-center shrink-0">
              {user.photoURL ? (
                <img
                  src={user.photoURL}
                  alt={user.displayName || "User"}
                  className="w-full h-full object-cover"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <span className="text-slate-600 font-bold text-xs">
                  {user.displayName ? user.displayName.charAt(0).toUpperCase() : "P"}
                </span>
              )}
            </div>
          </div>
        )}
      </div>
    </header>
  );
};
