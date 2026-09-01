import React from "react";
import { User } from "firebase/auth";
import { WellBridgeLogo } from "./WellBridgeLogo";

interface AppHeaderProps {
  user: User | null;
  onSignOut: () => void;
}

export const AppHeader: React.FC<AppHeaderProps> = ({ user, onSignOut }) => {
  return (
    <header className="min-h-16 h-auto bg-white border-b border-slate-200 flex items-center justify-between px-3 sm:px-8 py-2 flex-shrink-0 sticky top-0 z-40">
      {/* Left: Logo and App Title */}
      <div className="flex items-center gap-2 sm:gap-3 min-w-0">
        <div className="w-9 h-9 sm:w-10 sm:h-10 flex items-center justify-center bg-teal-50 rounded-lg shrink-0">
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

      {/* Right: User Section & Sign Out */}
      {user && (
        <div className="flex items-center gap-2 sm:gap-4 shrink-0">
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
    </header>
  );
};
