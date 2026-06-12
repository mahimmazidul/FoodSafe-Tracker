import { useStore, type Page } from "@/store";
import { Home, Thermometer, Bell, Building2, Menu } from "lucide-react";
import { cn } from "@/utils/cn";
import { motion } from "framer-motion";

const navItems: { page: Page; icon: typeof Home; label: string }[] = [
  { page: "dashboard", icon: Home, label: "Home" },
  { page: "temperature", icon: Thermometer, label: "Log" },
  { page: "alerts", icon: Bell, label: "Alerts" },
  { page: "facilities", icon: Building2, label: "Sites" },
];

export default function MobileBottomNav() {
  const { setPage, currentPage, toggleSidebar, alerts } = useStore();
  const openAlerts = alerts.filter((a) => a.status === "open").length;

  return (
    <nav className="fixed bottom-0 left-0 right-0 lg:hidden bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800 px-2 py-1.5 z-40 safe-area-pb">
      <div className="flex justify-around items-center max-w-md mx-auto">
        {navItems.map(({ page, icon: Icon, label }) => {
          const isActive = currentPage === page;
          return (
            <button
              key={page}
              onClick={() => setPage(page)}
              className={cn(
                "flex flex-col items-center gap-0.5 px-4 py-1.5 rounded-xl text-[10px] font-medium transition-all relative min-w-[60px]",
                isActive
                  ? "text-emerald-600 dark:text-emerald-400"
                  : "text-gray-500 dark:text-gray-400"
              )}
            >
              <div className="relative">
                <Icon className={cn("w-5 h-5", isActive && "scale-110")} />
                {page === "alerts" && openAlerts > 0 && (
                  <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full flex items-center justify-center text-[8px] text-white font-bold">
                    {openAlerts > 9 ? "9+" : openAlerts}
                  </span>
                )}
              </div>
              <span>{label}</span>
              {isActive && (
                <motion.div
                  layoutId="bottomNav"
                  className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-1 h-1 bg-emerald-500 rounded-full"
                />
              )}
            </button>
          );
        })}
        <button
          onClick={toggleSidebar}
          className="flex flex-col items-center gap-0.5 px-4 py-1.5 rounded-xl text-[10px] font-medium text-gray-500 dark:text-gray-400 min-w-[60px]"
        >
          <Menu className="w-5 h-5" />
          <span>More</span>
        </button>
      </div>
    </nav>
  );
}
