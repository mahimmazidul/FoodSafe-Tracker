import { useState, useEffect } from "react";
import { useStore } from "@/store";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Thermometer, Bell, FileText, X } from "lucide-react";
import { cn } from "@/utils/cn";

interface FABAction {
  icon: typeof Thermometer;
  label: string;
  color: string;
  onClick: () => void;
}

export default function FloatingActionButton() {
  const { setPage, hasPermission } = useStore();
  const [isOpen, setIsOpen] = useState(false);

  const actions: FABAction[] = [
    {
      icon: Thermometer,
      label: "Log Temperature",
      color: "bg-sky-500 hover:bg-sky-600",
      onClick: () => {
        setPage("temperature");
        setIsOpen(false);
      },
    },
    {
      icon: Bell,
      label: "View Alerts",
      color: "bg-amber-500 hover:bg-amber-600",
      onClick: () => {
        setPage("alerts");
        setIsOpen(false);
      },
    },
  ];

  if (hasPermission("generate_reports")) {
    actions.push({
      icon: FileText,
      label: "Generate Report",
      color: "bg-violet-500 hover:bg-violet-600",
      onClick: () => {
        setPage("reports");
        setIsOpen(false);
      },
    });
  }

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "l" && !e.metaKey && !e.ctrlKey && !(e.target instanceof HTMLInputElement) && !(e.target instanceof HTMLTextAreaElement)) {
        e.preventDefault();
        setPage("temperature");
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [setPage]);

  return (
    <div className="fixed bottom-24 lg:bottom-8 right-4 lg:right-8 z-30">
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="absolute bottom-16 right-0 flex flex-col gap-2 items-end"
          >
            {actions.map((action, i) => {
              const Icon = action.icon;
              return (
                <motion.button
                  key={action.label}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  transition={{ delay: i * 0.05 }}
                  onClick={action.onClick}
                  className={cn(
                    "flex items-center gap-2 pl-3 pr-4 py-2 rounded-full text-white text-sm font-medium shadow-lg transition-all",
                    action.color
                  )}
                >
                  <Icon className="w-4 h-4" />
                  {action.label}
                </motion.button>
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>

      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "w-14 h-14 rounded-full shadow-lg flex items-center justify-center transition-all duration-300",
          isOpen
            ? "bg-gray-800 dark:bg-gray-200"
            : "bg-emerald-600 hover:bg-emerald-700"
        )}
      >
        <motion.div
          animate={{ rotate: isOpen ? 45 : 0 }}
          transition={{ duration: 0.2 }}
        >
          {isOpen ? (
            <X className="w-6 h-6 text-white dark:text-gray-900" />
          ) : (
            <Plus className="w-6 h-6 text-white" />
          )}
        </motion.div>
      </motion.button>

      <div className="hidden lg:block absolute -top-8 right-0 text-[10px] text-gray-400 dark:text-gray-500 whitespace-nowrap">
        Press <kbd className="px-1 py-0.5 bg-gray-100 dark:bg-gray-800 rounded font-mono">L</kbd> to log
      </div>
    </div>
  );
}
