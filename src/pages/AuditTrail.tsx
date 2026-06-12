import { useStore } from "@/store";
import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import PageTransition from "@/components/PageTransition";
import {
  ThermometerIcon,
  BellRingIcon,
  EyeIcon,
  CheckCircleIcon,
  MapPinIcon,
  PencilIcon,
  WrenchIcon,
  FileTextIcon,
  BuildingIcon,
  UserIcon,
  LogOutIcon,
  PlusUserIcon,
  TrashIcon,
  ClipboardIcon,
} from "@/components/Icons";
import { Search, Filter, ChevronLeft, ChevronRight, Clock, User } from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";
import type { AuditAction } from "@/store/types";

const PAGE_SIZE = 20;

const actionConfig: Record<AuditAction, { icon: React.ComponentType<{ className?: string }>; color: string; label: string }> = {
  user_login: { icon: UserIcon, color: "bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400", label: "User Login" },
  user_logout: { icon: LogOutIcon, color: "bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400", label: "User Logout" },
  temperature_logged: { icon: ThermometerIcon, color: "bg-sky-100 dark:bg-sky-900/40 text-sky-600 dark:text-sky-400", label: "Temperature Logged" },
  alert_created: { icon: BellRingIcon, color: "bg-red-100 dark:bg-red-900/40 text-red-600 dark:text-red-400", label: "Alert Created" },
  alert_acknowledged: { icon: EyeIcon, color: "bg-amber-100 dark:bg-amber-900/40 text-amber-600 dark:text-amber-400", label: "Alert Acknowledged" },
  alert_resolved: { icon: CheckCircleIcon, color: "bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400", label: "Alert Resolved" },
  checkpoint_created: { icon: MapPinIcon, color: "bg-violet-100 dark:bg-violet-900/40 text-violet-600 dark:text-violet-400", label: "Checkpoint Created" },
  checkpoint_modified: { icon: PencilIcon, color: "bg-orange-100 dark:bg-orange-900/40 text-orange-600 dark:text-orange-400", label: "Checkpoint Modified" },
  corrective_action_added: { icon: WrenchIcon, color: "bg-indigo-100 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400", label: "Corrective Action" },
  report_generated: { icon: FileTextIcon, color: "bg-teal-100 dark:bg-teal-900/40 text-teal-600 dark:text-teal-400", label: "Report Generated" },
  facility_created: { icon: BuildingIcon, color: "bg-pink-100 dark:bg-pink-900/40 text-pink-600 dark:text-pink-400", label: "Facility Created" },
  facility_updated: { icon: BuildingIcon, color: "bg-pink-100 dark:bg-pink-900/40 text-pink-600 dark:text-pink-400", label: "Facility Updated" },
  user_created: { icon: PlusUserIcon, color: "bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400", label: "User Created" },
  user_updated: { icon: PencilIcon, color: "bg-amber-100 dark:bg-amber-900/40 text-amber-600 dark:text-amber-400", label: "User Updated" },
  user_deleted: { icon: TrashIcon, color: "bg-red-100 dark:bg-red-900/40 text-red-600 dark:text-red-400", label: "User Deleted" },
};

export default function AuditTrail() {
  const { auditLog, hasPermission } = useStore();
  const [search, setSearch] = useState("");
  const [filterAction, setFilterAction] = useState("");
  const [filterUser, setFilterUser] = useState("");
  const [page, setPage] = useState(0);

  const canView = hasPermission("view_audit");

  const users = useMemo(() => [...new Set(auditLog.map((e) => e.user))], [auditLog]);
  const actions = useMemo(() => [...new Set(auditLog.map((e) => e.action))], [auditLog]);

  const filtered = useMemo(() => {
    let list = [...auditLog];
    if (search) list = list.filter((e) => e.details.toLowerCase().includes(search.toLowerCase()) || e.action.toLowerCase().includes(search.toLowerCase()));
    if (filterAction) list = list.filter((e) => e.action === filterAction);
    if (filterUser) list = list.filter((e) => e.user === filterUser);
    return list;
  }, [auditLog, search, filterAction, filterUser]);

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paginated = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  if (!canView) {
    return (
      <PageTransition>
        <div className="p-4 lg:p-6 flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="w-16 h-16 mx-auto rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center mb-4">
              <ClipboardIcon className="w-8 h-8 text-red-500" />
            </div>
            <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-2">Access Denied</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">You don't have permission to view the audit trail.</p>
          </div>
        </div>
      </PageTransition>
    );
  }

  return (
    <PageTransition>
      <div className="p-4 lg:p-6 space-y-4">
        <div className="flex items-center justify-between">
          <p className="text-sm text-gray-500 dark:text-gray-400">{filtered.length} audit entries</p>
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex items-center gap-2 bg-gray-100 dark:bg-gray-800 rounded-xl px-3 py-2 flex-1">
            <Search className="w-4 h-4 text-gray-400" />
            <input value={search} onChange={(e) => { setSearch(e.target.value); setPage(0); }} placeholder="Search audit log..." className="bg-transparent border-none outline-none text-sm text-gray-700 dark:text-gray-300 w-full" />
          </div>
          <div className="flex gap-2">
            <div className="flex items-center gap-1.5 bg-gray-100 dark:bg-gray-800 rounded-xl px-3">
              <Filter className="w-3.5 h-3.5 text-gray-400" />
              <select value={filterAction} onChange={(e) => { setFilterAction(e.target.value); setPage(0); }} className="bg-transparent border-none outline-none text-xs text-gray-600 dark:text-gray-300 py-2 pr-6">
                <option value="">All Actions</option>
                {actions.map((a) => <option key={a} value={a}>{actionConfig[a]?.label || a}</option>)}
              </select>
            </div>
            <div className="flex items-center gap-1.5 bg-gray-100 dark:bg-gray-800 rounded-xl px-3">
              <User className="w-3.5 h-3.5 text-gray-400" />
              <select value={filterUser} onChange={(e) => { setFilterUser(e.target.value); setPage(0); }} className="bg-transparent border-none outline-none text-xs text-gray-600 dark:text-gray-300 py-2 pr-6">
                <option value="">All Users</option>
                {users.map((u) => <option key={u} value={u}>{u}</option>)}
              </select>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 overflow-hidden">
          {paginated.length === 0 && (
            <div className="px-6 py-12 text-center">
              <ClipboardIcon className="w-10 h-10 mx-auto mb-3 text-gray-300 dark:text-gray-600" />
              <p className="text-sm text-gray-400">No audit entries found</p>
            </div>
          )}
          <div className="divide-y divide-gray-50 dark:divide-gray-700/50">
            {paginated.map((entry, i) => {
              const config = actionConfig[entry.action];
              const Icon = config?.icon || ClipboardIcon;
              return (
                <motion.div
                  key={entry.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: i * 0.02 }}
                  className="px-6 py-3.5 hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors flex items-start gap-4"
                >
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 mt-0.5 ${config?.color || "bg-gray-100 dark:bg-gray-700 text-gray-500"}`}>
                    <Icon className="w-4 h-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-semibold text-gray-900 dark:text-white">{config?.label || entry.action}</span>
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 font-medium">{entry.entityType}</span>
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 truncate">{entry.details}</p>
                    <div className="flex items-center gap-3 mt-1 text-[10px] text-gray-400">
                      <span className="flex items-center gap-1">
                        <User className="w-2.5 h-2.5" />
                        {entry.user}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="w-2.5 h-2.5" />
                        {formatDistanceToNow(new Date(entry.timestamp), { addSuffix: true })}
                      </span>
                      <span>{format(new Date(entry.timestamp), "MMM d, h:mm:ss a")}</span>
                    </div>
                  </div>
                  <span className="text-[9px] font-mono text-gray-400 shrink-0">{entry.id.slice(0, 8)}</span>
                </motion.div>
              );
            })}
          </div>

          {totalPages > 1 && (
            <div className="px-6 py-3 border-t border-gray-100 dark:border-gray-700 flex items-center justify-between">
              <span className="text-xs text-gray-400">Page {page + 1} of {totalPages}</span>
              <div className="flex gap-1">
                <button onClick={() => setPage(Math.max(0, page - 1))} disabled={page === 0} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-30 transition-colors"><ChevronLeft className="w-4 h-4 text-gray-500" /></button>
                <button onClick={() => setPage(Math.min(totalPages - 1, page + 1))} disabled={page >= totalPages - 1} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-30 transition-colors"><ChevronRight className="w-4 h-4 text-gray-500" /></button>
              </div>
            </div>
          )}
        </div>
      </div>
    </PageTransition>
  );
}
