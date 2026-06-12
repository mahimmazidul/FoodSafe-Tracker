import { useEffect } from "react";
import { useStore } from "@/store";
import Sidebar from "@/components/Sidebar";
import Header from "@/components/Header";
import Breadcrumb from "@/components/Breadcrumb";
import ToastContainer from "@/components/Toast";
import CommandPalette from "@/components/CommandPalette";
import MobileBottomNav from "@/components/MobileBottomNav";
import FloatingActionButton from "@/components/FloatingActionButton";
import Login from "@/pages/Login";
import Dashboard from "@/pages/Dashboard";
import Facilities from "@/pages/Facilities";
import Checkpoints from "@/pages/Checkpoints";
import Temperature from "@/pages/Temperature";
import Alerts from "@/pages/Alerts";
import Reports from "@/pages/Reports";
import Analytics from "@/pages/Analytics";
import AuditTrail from "@/pages/AuditTrail";
import Users from "@/pages/Users";
import Settings from "@/pages/Settings";
import { motion } from "framer-motion";

const pages: Record<string, React.ComponentType> = {
  dashboard: Dashboard,
  facilities: Facilities,
  checkpoints: Checkpoints,
  temperature: Temperature,
  alerts: Alerts,
  reports: Reports,
  analytics: Analytics,
  audit: AuditTrail,
  users: Users,
  settings: Settings,
};

function LoadingScreen() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 via-emerald-50/30 to-gray-100 dark:from-gray-950 dark:via-emerald-950/20 dark:to-gray-900">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="text-center"
      >
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          className="w-12 h-12 mx-auto mb-4 rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-700 flex items-center justify-center shadow-lg shadow-emerald-500/30"
        >
          <svg className="w-6 h-6 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10" />
            <path d="m9 12 2 2 4-4" />
          </svg>
        </motion.div>
        <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Loading FoodSafe...</p>
      </motion.div>
    </div>
  );
}

export default function App() {
  const { darkMode, currentPage, isAuthenticated, isLoading, initialize, isInitialized } = useStore();

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }, [darkMode]);

  useEffect(() => {
    if (!isInitialized) {
      initialize();
    }
  }, [isInitialized, initialize]);

  if (isLoading || !isInitialized) {
    return <LoadingScreen />;
  }

  if (!isAuthenticated) {
    return (
      <>
        <Login />
        <ToastContainer />
      </>
    );
  }

  const PageComponent = pages[currentPage] || Dashboard;

  return (
    <div className="flex h-screen bg-gray-50 dark:bg-gray-950 transition-colors duration-300">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <Header />
        <Breadcrumb />
        <main className="flex-1 overflow-y-auto scroll-smooth pb-20 lg:pb-0">
          <PageComponent key={currentPage} />
        </main>
      </div>
      <ToastContainer />
      <CommandPalette />
      <MobileBottomNav />
      <FloatingActionButton />
    </div>
  );
}
