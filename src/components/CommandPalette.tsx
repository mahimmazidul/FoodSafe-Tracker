import { useStore, type Page } from "@/store";
import { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search,
  Home,
  Building2,
  Thermometer,
  Bell,
  FileText,
  BarChart3,
  ClipboardList,
  ShieldCheck,
  Users,
  Settings,
  ArrowRight,
  Command,
} from "lucide-react";
import { cn } from "@/utils/cn";

interface SearchResult {
  id: string;
  type: "page" | "facility" | "checkpoint" | "action";
  title: string;
  subtitle?: string;
  icon: typeof Home;
  action: () => void;
}

const pageIcons: Record<Page, typeof Home> = {
  dashboard: Home,
  facilities: Building2,
  checkpoints: ShieldCheck,
  temperature: Thermometer,
  alerts: Bell,
  reports: FileText,
  analytics: BarChart3,
  audit: ClipboardList,
  users: Users,
  settings: Settings,
};

export default function CommandPalette() {
  const { searchOpen, setSearchOpen, setPage, facilities, checkpoints, hasPermission } = useStore();
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setSearchOpen(!searchOpen);
      }
      if (e.key === "Escape") {
        setSearchOpen(false);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [searchOpen, setSearchOpen]);

  useEffect(() => {
    if (searchOpen) {
      setQuery("");
      setSelectedIndex(0);
    }
  }, [searchOpen]);

  const results = useMemo<SearchResult[]>(() => {
    const items: SearchResult[] = [];
    const q = query.toLowerCase();

    const pages: { page: Page; label: string; permission?: string }[] = [
      { page: "dashboard", label: "Dashboard" },
      { page: "facilities", label: "Facilities", permission: "view_facilities" },
      { page: "checkpoints", label: "Checkpoints", permission: "view_checkpoints" },
      { page: "temperature", label: "Temperature Logs", permission: "log_temperature" },
      { page: "alerts", label: "Alerts", permission: "view_alerts" },
      { page: "reports", label: "Reports", permission: "view_reports" },
      { page: "analytics", label: "Analytics", permission: "view_analytics" },
      { page: "audit", label: "Audit Trail", permission: "view_audit" },
      { page: "users", label: "User Management", permission: "manage_users" },
      { page: "settings", label: "Settings" },
    ];

    pages
      .filter((p) => !p.permission || hasPermission(p.permission))
      .filter((p) => p.label.toLowerCase().includes(q))
      .forEach((p) => {
        items.push({
          id: `page-${p.page}`,
          type: "page",
          title: p.label,
          subtitle: "Go to page",
          icon: pageIcons[p.page],
          action: () => {
            setPage(p.page);
            setSearchOpen(false);
          },
        });
      });

    facilities
      .filter((f) => f.name.toLowerCase().includes(q) || f.address.toLowerCase().includes(q))
      .slice(0, 5)
      .forEach((f) => {
        items.push({
          id: `facility-${f.id}`,
          type: "facility",
          title: f.name,
          subtitle: f.address,
          icon: Building2,
          action: () => {
            setPage("facilities");
            setSearchOpen(false);
          },
        });
      });

    checkpoints
      .filter((c) => c.name.toLowerCase().includes(q))
      .slice(0, 5)
      .forEach((c) => {
        const fac = facilities.find((f) => f.id === c.facilityId);
        items.push({
          id: `checkpoint-${c.id}`,
          type: "checkpoint",
          title: c.name,
          subtitle: fac?.name,
          icon: ShieldCheck,
          action: () => {
            setPage("checkpoints");
            setSearchOpen(false);
          },
        });
      });

    return items.slice(0, 10);
  }, [query, facilities, checkpoints, hasPermission, setPage, setSearchOpen]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((i) => Math.min(i + 1, results.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter" && results[selectedIndex]) {
      results[selectedIndex].action();
    }
  };

  return (
    <AnimatePresence>
      {searchOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50"
            onClick={() => setSearchOpen(false)}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: -20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -20 }}
            transition={{ duration: 0.15 }}
            className="fixed top-[20%] left-1/2 -translate-x-1/2 w-full max-w-xl bg-white dark:bg-gray-800 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 z-50 overflow-hidden"
          >
            <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-100 dark:border-gray-700">
              <Search className="w-5 h-5 text-gray-400" />
              <input
                autoFocus
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setSelectedIndex(0);
                }}
                onKeyDown={handleKeyDown}
                placeholder="Search pages, facilities, checkpoints..."
                className="flex-1 bg-transparent border-none outline-none text-sm text-gray-900 dark:text-white placeholder-gray-400"
              />
              <kbd className="hidden sm:flex items-center gap-0.5 px-1.5 py-0.5 text-[10px] bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 rounded font-mono">
                ESC
              </kbd>
            </div>

            <div className="max-h-80 overflow-y-auto">
              {results.length === 0 && query && (
                <div className="px-4 py-8 text-center text-sm text-gray-400">
                  No results found for "{query}"
                </div>
              )}
              {results.length === 0 && !query && (
                <div className="px-4 py-6">
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Quick Actions</p>
                  <div className="space-y-1">
                    {[
                      { label: "Log Temperature", icon: Thermometer, page: "temperature" as Page },
                      { label: "View Alerts", icon: Bell, page: "alerts" as Page },
                      { label: "Generate Report", icon: FileText, page: "reports" as Page },
                    ].map((item) => (
                      <button
                        key={item.label}
                        onClick={() => {
                          setPage(item.page);
                          setSearchOpen(false);
                        }}
                        className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors text-left"
                      >
                        <item.icon className="w-4 h-4 text-gray-400" />
                        <span className="text-sm text-gray-700 dark:text-gray-300">{item.label}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
              {results.map((result, i) => {
                const Icon = result.icon;
                return (
                  <button
                    key={result.id}
                    onClick={result.action}
                    className={cn(
                      "w-full flex items-center gap-3 px-4 py-3 transition-colors text-left",
                      i === selectedIndex
                        ? "bg-emerald-50 dark:bg-emerald-900/30"
                        : "hover:bg-gray-50 dark:hover:bg-gray-700/50"
                    )}
                  >
                    <div className={cn(
                      "w-8 h-8 rounded-lg flex items-center justify-center",
                      result.type === "page" ? "bg-emerald-100 dark:bg-emerald-900/40" :
                      result.type === "facility" ? "bg-violet-100 dark:bg-violet-900/40" :
                      "bg-sky-100 dark:bg-sky-900/40"
                    )}>
                      <Icon className={cn(
                        "w-4 h-4",
                        result.type === "page" ? "text-emerald-600 dark:text-emerald-400" :
                        result.type === "facility" ? "text-violet-600 dark:text-violet-400" :
                        "text-sky-600 dark:text-sky-400"
                      )} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{result.title}</p>
                      {result.subtitle && (
                        <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{result.subtitle}</p>
                      )}
                    </div>
                    <ArrowRight className="w-4 h-4 text-gray-300 dark:text-gray-600" />
                  </button>
                );
              })}
            </div>

            <div className="px-4 py-2 border-t border-gray-100 dark:border-gray-700 flex items-center justify-between">
              <div className="flex items-center gap-4 text-[10px] text-gray-400">
                <span className="flex items-center gap-1">
                  <kbd className="px-1 py-0.5 bg-gray-100 dark:bg-gray-700 rounded">↑↓</kbd> Navigate
                </span>
                <span className="flex items-center gap-1">
                  <kbd className="px-1 py-0.5 bg-gray-100 dark:bg-gray-700 rounded">↵</kbd> Select
                </span>
              </div>
              <div className="flex items-center gap-1 text-[10px] text-gray-400">
                <Command className="w-3 h-3" />
                <span>K to open</span>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
