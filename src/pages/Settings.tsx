import { useStore } from "@/store";
import { motion } from "framer-motion";
import PageTransition from "@/components/PageTransition";
import { ShieldCheckIcon } from "@/components/Icons";
import { Sun, Moon, Bell, Database, Code, Shield } from "lucide-react";

export default function Settings() {
  const { darkMode, toggleDarkMode, currentUser, apiMode } = useStore();

  return (
    <PageTransition>
      <div className="p-4 lg:p-6 space-y-6 max-w-3xl">
        <p className="text-sm text-gray-500 dark:text-gray-400">Manage your application preferences</p>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 divide-y divide-gray-100 dark:divide-gray-700"
        >
          <div className="px-6 py-4">
            <h3 className="text-sm font-bold text-gray-900 dark:text-white">Appearance</h3>
          </div>
          <div className="px-6 py-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              {darkMode ? <Moon className="w-5 h-5 text-violet-500" /> : <Sun className="w-5 h-5 text-amber-500" />}
              <div>
                <p className="text-sm font-medium text-gray-800 dark:text-gray-200">Dark Mode</p>
                <p className="text-xs text-gray-400">Toggle between light and dark themes</p>
              </div>
            </div>
            <button
              onClick={toggleDarkMode}
              className={`relative w-12 h-6 rounded-full transition-colors duration-300 ${darkMode ? "bg-emerald-500" : "bg-gray-300 dark:bg-gray-600"}`}
            >
              <motion.div
                className="absolute top-0.5 w-5 h-5 rounded-full bg-white shadow-md"
                animate={{ left: darkMode ? "26px" : "2px" }}
                transition={{ type: "spring", stiffness: 500, damping: 30 }}
              />
            </button>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 divide-y divide-gray-100 dark:divide-gray-700"
        >
          <div className="px-6 py-4">
            <h3 className="text-sm font-bold text-gray-900 dark:text-white">Notifications</h3>
          </div>
          {[
            { label: "Critical Alerts", desc: "Instant notification for critical temperature violations", enabled: true },
            { label: "Daily Digest", desc: "Summary of daily compliance status", enabled: true },
            { label: "Weekly Report", desc: "Automated weekly compliance report", enabled: false },
            { label: "Sound Alerts", desc: "Play sound for critical violations", enabled: false },
          ].map((item) => (
            <div key={item.label} className="px-6 py-3.5 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Bell className="w-4 h-4 text-gray-400" />
                <div>
                  <p className="text-sm font-medium text-gray-800 dark:text-gray-200">{item.label}</p>
                  <p className="text-xs text-gray-400">{item.desc}</p>
                </div>
              </div>
              <div className={`w-10 h-5 rounded-full ${item.enabled ? "bg-emerald-500" : "bg-gray-300 dark:bg-gray-600"} relative cursor-pointer transition-colors`}>
                <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow-sm transition-all ${item.enabled ? "left-[22px]" : "left-0.5"}`} />
              </div>
            </div>
          ))}
        </motion.div>

        {currentUser && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 divide-y divide-gray-100 dark:divide-gray-700"
          >
            <div className="px-6 py-4">
              <h3 className="text-sm font-bold text-gray-900 dark:text-white">Account</h3>
            </div>
            <div className="px-6 py-4">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center text-white text-lg font-bold shadow-lg">
                  {currentUser.avatar}
                </div>
                <div>
                  <p className="text-base font-bold text-gray-900 dark:text-white">{currentUser.name}</p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">{currentUser.email}</p>
                  <span className="inline-flex items-center mt-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300">
                    {currentUser.role === "superadmin" ? "Super Admin" : currentUser.role === "manager" ? "Manager" : "Field Engineer"}
                  </span>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 divide-y divide-gray-100 dark:divide-gray-700"
        >
          <div className="px-6 py-4">
            <h3 className="text-sm font-bold text-gray-900 dark:text-white">About</h3>
          </div>
          {[
            { icon: Shield, label: "Version", value: "1.0.0" },
            { icon: Code, label: "License", value: "MIT Open Source" },
            { icon: Database, label: "Data Storage", value: apiMode === "remote" ? "REST API (Server)" : "Local (Browser)" },
          ].map(({ icon: Icon, label, value }) => (
            <div key={label} className="px-6 py-3.5 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Icon className="w-4 h-4 text-gray-400" />
                <p className="text-sm font-medium text-gray-800 dark:text-gray-200">{label}</p>
              </div>
              <span className="text-xs text-gray-500 dark:text-gray-400 font-mono">{value}</span>
            </div>
          ))}
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-gradient-to-br from-emerald-50 to-emerald-100 dark:from-emerald-900/20 dark:to-emerald-800/20 rounded-2xl border border-emerald-200 dark:border-emerald-800 p-6"
        >
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-700 flex items-center justify-center shadow-md shadow-emerald-500/20">
              <ShieldCheckIcon className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-emerald-900 dark:text-emerald-100">FoodSafe Tracker</h3>
              <p className="text-xs text-emerald-700 dark:text-emerald-300">Open Source Food Safety Compliance</p>
            </div>
          </div>
          <p className="text-xs text-emerald-800 dark:text-emerald-200 leading-relaxed">
            Built for small food businesses to keep track of safety checkpoints, log temperature readings, and generate compliance reports without drowning in paperwork. Self-hostable, lightweight, and community-driven.
          </p>
          <div className="flex gap-2 mt-4">
            <a
              href="https://github.com/mahimmazidul/FoodSafe-Tracker"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 text-white text-xs font-semibold hover:bg-emerald-700 transition-colors"
            >
              <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
              </svg>
              Star on GitHub
            </a>
            <a
              href="https://github.com/mahimmazidul/FoodSafe-Tracker"
              target="_blank"
              rel="noopener noreferrer"
              className="px-3 py-1.5 rounded-lg bg-white dark:bg-gray-800 text-emerald-700 dark:text-emerald-300 text-xs font-semibold border border-emerald-300 dark:border-emerald-700 hover:bg-emerald-50 dark:hover:bg-gray-700 transition-colors"
            >
              Contribute
            </a>
          </div>
        </motion.div>
      </div>
    </PageTransition>
  );
}
