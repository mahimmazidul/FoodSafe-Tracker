import { useStore } from "@/store";
import {
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
  ChevronRight,
} from "lucide-react";
import type { Page } from "@/store";

const pageConfig: Record<Page, { label: string; icon: typeof Home }> = {
  dashboard: { label: "Dashboard", icon: Home },
  facilities: { label: "Facilities", icon: Building2 },
  checkpoints: { label: "Checkpoints", icon: ShieldCheck },
  temperature: { label: "Temperature Logs", icon: Thermometer },
  alerts: { label: "Alerts", icon: Bell },
  reports: { label: "Reports", icon: FileText },
  analytics: { label: "Analytics", icon: BarChart3 },
  audit: { label: "Audit Trail", icon: ClipboardList },
  users: { label: "User Management", icon: Users },
  settings: { label: "Settings", icon: Settings },
};

export default function Breadcrumb() {
  const { currentPage, setPage } = useStore();
  const config = pageConfig[currentPage];
  const Icon = config?.icon || Home;

  if (currentPage === "dashboard") return null;

  return (
    <div className="flex items-center gap-2 px-4 lg:px-6 py-2 bg-gray-50/50 dark:bg-gray-900/50 border-b border-gray-100 dark:border-gray-800">
      <button
        onClick={() => setPage("dashboard")}
        className="flex items-center gap-1.5 text-xs text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300 font-medium transition-colors"
      >
        <Home className="w-3.5 h-3.5" />
        <span className="hidden sm:inline">Dashboard</span>
      </button>
      <ChevronRight className="w-3.5 h-3.5 text-gray-300 dark:text-gray-600" />
      <span className="flex items-center gap-1.5 text-xs text-gray-600 dark:text-gray-400 font-medium">
        <Icon className="w-3.5 h-3.5" />
        {config?.label || "Page"}
      </span>
    </div>
  );
}
