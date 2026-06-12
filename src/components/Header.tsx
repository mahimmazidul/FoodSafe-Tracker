import { useStore } from "@/store";
import { Menu, Moon, Sun, Bell, Search, LogOut, Maximize2, Command } from "lucide-react";
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { formatDistanceToNow } from "date-fns";
import { SeverityBadge } from "./Badge";
import { ROLE_LABELS } from "@/store/types";
import { cn } from "@/utils/cn";

export default function Header() {
  const {
    toggleSidebar,
    toggleDarkMode,
    darkMode,
    currentPage,
    alerts,
    updateAlertStatus,
    currentUser,
    logout,
    setSearchOpen,
  } = useStore();
  const [showNotif, setShowNotif] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const openAlerts = alerts.filter((a) => a.status === "open");

  const pageTitle: Record<string, string> = {
    dashboard: "Dashboard",
    facilities: "Facilities",
    checkpoints: "Checkpoints",
    temperature: "Temperature Logs",
    alerts: "Alerts",
    reports: "Reports",
    analytics: "Analytics",
    audit: "Audit Trail",
    users: "User Management",
    settings: "Settings",
  };

  useEffect(() => {
    const handleFullscreen = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener("fullscreenchange", handleFullscreen);
    return () => document.removeEventListener("fullscreenchange", handleFullscreen);
  }, []);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
    } else {
      document.exitFullscreen();
    }
  };

  return (
    <header className="sticky top-0 z-30 h-16 bg-white/90 dark:bg-gray-900/90 backdrop-blur-xl border-b border-gray-200 dark:border-gray-800 flex items-center px-4 lg:px-6 gap-3">
      <button
        onClick={toggleSidebar}
        className="lg:hidden p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
      >
        <Menu className="w-5 h-5 text-gray-600 dark:text-gray-300" />
      </button>

      <div className="hidden lg:block">
        <h2 className="text-lg font-bold text-gray-900 dark:text-white">{pageTitle[currentPage]}</h2>
      </div>

      <div className="flex-1" />

      <button
        onClick={() => setSearchOpen(true)}
        className="flex items-center gap-2 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-xl px-3 py-2 transition-colors cursor-pointer group"
      >
        <Search className="w-4 h-4 text-gray-400 group-hover:text-gray-600 dark:group-hover:text-gray-300" />
        <span className="hidden md:inline text-sm text-gray-400 group-hover:text-gray-600 dark:group-hover:text-gray-300">Search...</span>
        <kbd className="hidden lg:flex items-center gap-0.5 px-1.5 py-0.5 text-[10px] bg-gray-200 dark:bg-gray-700 text-gray-500 dark:text-gray-400 rounded font-mono">
          <Command className="w-2.5 h-2.5" />K
        </kbd>
      </button>

      <div className="flex items-center gap-1">
        <button
          onClick={toggleDarkMode}
          className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 transition-all duration-200"
          title="Toggle dark mode"
        >
          <motion.div
            key={darkMode ? "moon" : "sun"}
            initial={{ rotate: -90, scale: 0 }}
            animate={{ rotate: 0, scale: 1 }}
            transition={{ type: "spring", stiffness: 300, damping: 20 }}
          >
            {darkMode ? <Sun className="w-5 h-5 text-amber-400" /> : <Moon className="w-5 h-5 text-gray-600" />}
          </motion.div>
        </button>

        <button
          onClick={toggleFullscreen}
          className="hidden lg:flex p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          title="Toggle fullscreen"
        >
          <Maximize2 className={cn("w-5 h-5", isFullscreen ? "text-emerald-500" : "text-gray-600 dark:text-gray-400")} />
        </button>

        <div className="relative">
          <button
            onClick={() => setShowNotif(!showNotif)}
            className="relative p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          >
            <Bell className="w-5 h-5 text-gray-600 dark:text-gray-300" />
            {openAlerts.length > 0 && (
              <span className="absolute top-1 right-1 flex h-4 w-4">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-4 w-4 bg-red-500 items-center justify-center text-[9px] font-bold text-white">
                  {openAlerts.length > 9 ? "9+" : openAlerts.length}
                </span>
              </span>
            )}
          </button>

          <AnimatePresence>
            {showNotif && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setShowNotif(false)} />
                <motion.div
                  initial={{ opacity: 0, y: -8, scale: 0.96 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -8, scale: 0.96 }}
                  transition={{ duration: 0.15 }}
                  className="absolute right-0 top-12 w-96 max-h-[480px] bg-white dark:bg-gray-800 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 z-50 overflow-hidden"
                >
                  <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between">
                    <h3 className="text-sm font-bold text-gray-900 dark:text-white">Notifications</h3>
                    <span className="text-[10px] bg-red-100 dark:bg-red-900/40 text-red-600 dark:text-red-300 px-2 py-0.5 rounded-full font-semibold">
                      {openAlerts.length} open
                    </span>
                  </div>
                  <div className="overflow-y-auto max-h-[380px] divide-y divide-gray-100 dark:divide-gray-700">
                    {openAlerts.length === 0 && (
                      <div className="px-4 py-8 text-center text-sm text-gray-400">
                        <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
                          <Bell className="w-6 h-6 text-emerald-500" />
                        </div>
                        <p className="font-medium">All clear!</p>
                        <p className="text-xs mt-1">No open alerts at the moment</p>
                      </div>
                    )}
                    {openAlerts.slice(0, 10).map((alert) => (
                      <motion.div
                        key={alert.id}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                      >
                        <div className="flex items-start gap-3">
                          <div className="mt-0.5">
                            <SeverityBadge severity={alert.severity} size="sm" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs text-gray-800 dark:text-gray-200 font-medium truncate">{alert.message}</p>
                            <p className="text-[10px] text-gray-400 mt-1">
                              {formatDistanceToNow(new Date(alert.createdAt), { addSuffix: true })}
                            </p>
                          </div>
                        </div>
                        <div className="flex gap-2 mt-2 ml-14">
                          <button
                            onClick={() => updateAlertStatus(alert.id, "acknowledged")}
                            className="text-[10px] px-2 py-1 rounded-md bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300 font-semibold hover:bg-amber-200 dark:hover:bg-amber-900/60 transition-colors"
                          >
                            Acknowledge
                          </button>
                          <button
                            onClick={() => updateAlertStatus(alert.id, "resolved")}
                            className="text-[10px] px-2 py-1 rounded-md bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 font-semibold hover:bg-emerald-200 dark:hover:bg-emerald-900/60 transition-colors"
                          >
                            Resolve
                          </button>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                  <div className="px-4 py-2 border-t border-gray-100 dark:border-gray-700">
                    <button
                      onClick={() => { useStore.getState().setPage("alerts"); setShowNotif(false); }}
                      className="w-full text-center text-xs text-emerald-600 dark:text-emerald-400 font-semibold hover:text-emerald-700 transition-colors py-1"
                    >
                      View all alerts →
                    </button>
                  </div>
                </motion.div>
              </>
            )}
          </AnimatePresence>
        </div>
      </div>

      <div className="h-8 w-px bg-gray-200 dark:bg-gray-700 mx-1 hidden lg:block" />

      <div className="relative">
        <button
          onClick={() => setShowProfile(!showProfile)}
          className="flex items-center gap-2 p-1 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
        >
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center text-white text-xs font-bold shadow-md">
            {currentUser?.avatar || "U"}
          </div>
          <div className="hidden xl:block text-left">
            <p className="text-sm font-medium text-gray-900 dark:text-white leading-tight">{currentUser?.name}</p>
            <p className="text-[10px] text-gray-500 dark:text-gray-400">{currentUser?.role ? ROLE_LABELS[currentUser.role] : ""}</p>
          </div>
        </button>

        <AnimatePresence>
          {showProfile && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setShowProfile(false)} />
              <motion.div
                initial={{ opacity: 0, y: -8, scale: 0.96 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -8, scale: 0.96 }}
                transition={{ duration: 0.15 }}
                className="absolute right-0 top-12 w-64 bg-white dark:bg-gray-800 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 z-50 overflow-hidden"
              >
                <div className="px-4 py-4 border-b border-gray-100 dark:border-gray-700">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center text-white text-sm font-bold shadow-md">
                      {currentUser?.avatar}
                    </div>
                    <div>
                      <p className="text-sm font-bold text-gray-900 dark:text-white">{currentUser?.name}</p>
                      <p className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium">
                        {currentUser?.role ? ROLE_LABELS[currentUser.role] : ""}
                      </p>
                    </div>
                  </div>
                  <p className="text-xs text-gray-400 mt-2 truncate">{currentUser?.email}</p>
                </div>
                <div className="p-2">
                  <button
                    onClick={() => { useStore.getState().setPage("settings"); setShowProfile(false); }}
                    className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors text-left"
                  >
                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" />
                      <circle cx="12" cy="12" r="3" />
                    </svg>
                    Settings
                  </button>
                  <button
                    onClick={() => { logout(); setShowProfile(false); }}
                    className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors text-left"
                  >
                    <LogOut className="w-4 h-4" />
                    Sign out
                  </button>
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>
      </div>
    </header>
  );
}
