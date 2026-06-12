import { useStore } from "@/store";
import { AnimatePresence, motion } from "framer-motion";
import { X, CheckCircle, AlertTriangle, AlertOctagon, Info } from "lucide-react";

const icons = {
  success: CheckCircle,
  warning: AlertTriangle,
  error: AlertOctagon,
  info: Info,
};

const colors = {
  success: "bg-emerald-50 border-emerald-300 text-emerald-800 dark:bg-emerald-950/60 dark:border-emerald-700 dark:text-emerald-200",
  warning: "bg-amber-50 border-amber-300 text-amber-800 dark:bg-amber-950/60 dark:border-amber-700 dark:text-amber-200",
  error: "bg-red-50 border-red-300 text-red-800 dark:bg-red-950/60 dark:border-red-700 dark:text-red-200",
  info: "bg-sky-50 border-sky-300 text-sky-800 dark:bg-sky-950/60 dark:border-sky-700 dark:text-sky-200",
};

export default function ToastContainer() {
  const toasts = useStore((s) => s.toasts);
  const removeToast = useStore((s) => s.removeToast);

  return (
    <div className="fixed bottom-4 right-4 z-[100] flex flex-col gap-2 max-w-sm w-full pointer-events-none">
      <AnimatePresence mode="popLayout">
        {toasts.map((toast) => {
          const Icon = icons[toast.type];
          return (
            <motion.div
              key={toast.id}
              initial={{ opacity: 0, x: 80, scale: 0.95 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: 80, scale: 0.95 }}
              transition={{ type: "spring", stiffness: 400, damping: 30 }}
              className={`pointer-events-auto rounded-xl border px-4 py-3 shadow-lg backdrop-blur-sm flex items-start gap-3 ${colors[toast.type]}`}
            >
              <Icon className="w-5 h-5 mt-0.5 shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm">{toast.title}</p>
                <p className="text-xs opacity-80 mt-0.5 truncate">{toast.message}</p>
              </div>
              <button onClick={() => removeToast(toast.id)} className="shrink-0 hover:opacity-60 transition-opacity">
                <X className="w-4 h-4" />
              </button>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
