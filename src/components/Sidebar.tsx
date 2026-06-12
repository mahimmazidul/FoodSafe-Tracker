import { useStore, type Page } from "@/store";
import { cn } from "@/utils/cn";
import {
  LayoutDashboard,
  Thermometer,
  ShieldCheck,
  Bell,
  FileText,
  BarChart3,
  ClipboardList,
  Building2,
  X,
  Settings,
  Users,
  LogOut,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { GithubIcon } from "./Icons";
import { ROLE_LABELS } from "@/store/types";

interface NavItem {
  page: Page;
  label: string;
  icon: typeof LayoutDashboard;
  permission?: string;
}

const navItems: NavItem[] = [
  { page: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { page: "facilities", label: "Facilities", icon: Building2, permission: "view_facilities" },
  { page: "checkpoints", label: "Checkpoints", icon: ShieldCheck, permission: "view_checkpoints" },
  { page: "temperature", label: "Temperature Logs", icon: Thermometer, permission: "log_temperature" },
  { page: "alerts", label: "Alerts", icon: Bell, permission: "view_alerts" },
  { page: "reports", label: "Reports", icon: FileText, permission: "view_reports" },
  { page: "analytics", label: "Analytics", icon: BarChart3, permission: "view_analytics" },
  { page: "audit", label: "Audit Trail", icon: ClipboardList, permission: "view_audit" },
  { page: "users", label: "Users", icon: Users, permission: "manage_users" },
  { page: "settings", label: "Settings", icon: Settings },
];

export default function Sidebar() {
  const { currentPage, setPage, sidebarOpen, toggleSidebar, alerts, currentUser, hasPermission, logout } = useStore();
  const openAlerts = alerts.filter((a) => a.status === "open").length;

  const visibleItems = navItems.filter((item) => !item.permission || hasPermission(item.permission));

  return (
    <>
      <AnimatePresence>
        {sidebarOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40 lg:hidden"
            onClick={toggleSidebar}
          />
        )}
      </AnimatePresence>

      <aside
        className={cn(
          "fixed top-0 left-0 h-full z-50 w-64 flex flex-col transition-transform duration-300 ease-out lg:translate-x-0 lg:static lg:z-auto",
          "bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800",
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="flex items-center justify-between px-5 h-16 border-b border-gray-100 dark:border-gray-800">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-500 to-emerald-700 flex items-center justify-center shadow-md shadow-emerald-500/20">
              <ShieldCheck className="w-4.5 h-4.5 text-white" />
            </div>
            <div>
              <h1 className="text-sm font-bold text-gray-900 dark:text-white leading-none">FoodSafe</h1>
              <p className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium">Tracker</p>
            </div>
          </div>
          <button onClick={toggleSidebar} className="lg:hidden p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {currentUser && (
          <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-800">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center text-white text-xs font-bold shadow-md">
                {currentUser.avatar}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">{currentUser.name}</p>
                <p className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium">{ROLE_LABELS[currentUser.role]}</p>
              </div>
            </div>
          </div>
        )}

        <nav className="flex-1 py-3 px-3 space-y-0.5 overflow-y-auto">
          {visibleItems.map(({ page, label, icon: Icon }) => {
            const active = currentPage === page;
            return (
              <button
                key={page}
                onClick={() => setPage(page)}
                className={cn(
                  "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200",
                  active
                    ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300 shadow-sm"
                    : "text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-gray-200"
                )}
              >
                <Icon className={cn("w-[18px] h-[18px]", active ? "text-emerald-600 dark:text-emerald-400" : "")} />
                <span className="flex-1 text-left">{label}</span>
                {page === "alerts" && openAlerts > 0 && (
                  <span className="flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full bg-red-500 text-white text-[10px] font-bold">
                    {openAlerts}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        <div className="p-3 border-t border-gray-100 dark:border-gray-800 space-y-1">
          <button
            onClick={logout}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors font-medium"
          >
            <LogOut className="w-4 h-4" />
            Sign out
          </button>
          <a
            href="https://github.com/mahimmazidul/FoodSafe-Tracker"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
          >
            <GithubIcon className="w-4 h-4" />
            <span>Open Source</span>
            <span className="ml-auto text-[10px] bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 px-1.5 py-0.5 rounded-full font-semibold">v1.0</span>
          </a>
        </div>
      </aside>
    </>
  );
}
