import { motion } from "framer-motion";
import { Plus, type LucideIcon } from "lucide-react";

interface EmptyStateProps {
  title: string;
  description: string;
  icon: LucideIcon;
  action?: {
    label: string;
    onClick: () => void;
  };
}

export default function EmptyState({ title, description, icon: Icon, action }: EmptyStateProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col items-center justify-center py-16 px-4"
    >
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: "spring", stiffness: 200, damping: 15, delay: 0.1 }}
        className="w-20 h-20 bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-700 dark:to-gray-800 rounded-2xl flex items-center justify-center mb-6 shadow-inner"
      >
        <Icon className="w-10 h-10 text-gray-400 dark:text-gray-500" />
      </motion.div>
      <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2 text-center">{title}</h3>
      <p className="text-sm text-gray-500 dark:text-gray-400 max-w-xs text-center mb-6">{description}</p>
      {action && (
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={action.onClick}
          className="flex items-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-semibold transition-all shadow-lg shadow-emerald-600/30"
        >
          <Plus className="w-4 h-4" />
          {action.label}
        </motion.button>
      )}
    </motion.div>
  );
}
