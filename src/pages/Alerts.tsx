import { useStore } from "@/store";
import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import PageTransition from "@/components/PageTransition";
import { SeverityBadge, StatusBadge } from "@/components/Badge";
import EmptyState from "@/components/EmptyState";
import { Search, Filter, Bell, ChevronLeft, ChevronRight, Thermometer, Clock } from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";

const PAGE_SIZE = 12;

export default function Alerts() {
  const { alerts, checkpoints, facilities, updateAlertStatus } = useStore();
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [filterSeverity, setFilterSeverity] = useState("");
  const [page, setPage] = useState(0);

  const filtered = useMemo(() => {
    let list = [...alerts];
    if (search) list = list.filter((a) => a.message.toLowerCase().includes(search.toLowerCase()));
    if (filterStatus) list = list.filter((a) => a.status === filterStatus);
    if (filterSeverity) list = list.filter((a) => a.severity === filterSeverity);
    return list;
  }, [alerts, search, filterStatus, filterSeverity]);

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paginated = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  const stats = useMemo(() => ({
    open: alerts.filter((a) => a.status === "open").length,
    acknowledged: alerts.filter((a) => a.status === "acknowledged").length,
    resolved: alerts.filter((a) => a.status === "resolved").length,
    critical: alerts.filter((a) => a.severity === "critical" && a.status === "open").length,
  }), [alerts]);

  return (
    <PageTransition>
      <div className="p-4 lg:p-6 space-y-4">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {[
            { label: "Open", value: stats.open, color: "red" },
            { label: "Critical Open", value: stats.critical, color: "red" },
            { label: "Acknowledged", value: stats.acknowledged, color: "amber" },
            { label: "Resolved", value: stats.resolved, color: "emerald" },
          ].map((s, i) => (
            <motion.div
              key={s.label}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4"
            >
              <p className="text-[10px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">{s.label}</p>
              <p className={`text-2xl font-bold mt-1 ${
                s.color === "red" ? "text-red-600 dark:text-red-400" :
                s.color === "amber" ? "text-amber-600 dark:text-amber-400" :
                "text-emerald-600 dark:text-emerald-400"
              }`}>{s.value}</p>
            </motion.div>
          ))}
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex items-center gap-2 bg-gray-100 dark:bg-gray-800 rounded-xl px-3 py-2 flex-1">
            <Search className="w-4 h-4 text-gray-400" />
            <input value={search} onChange={(e) => { setSearch(e.target.value); setPage(0); }} placeholder="Search alerts..." className="bg-transparent border-none outline-none text-sm text-gray-700 dark:text-gray-300 w-full" />
          </div>
          <div className="flex gap-2">
            <div className="flex items-center gap-1.5 bg-gray-100 dark:bg-gray-800 rounded-xl px-3">
              <Filter className="w-3.5 h-3.5 text-gray-400" />
              <select value={filterStatus} onChange={(e) => { setFilterStatus(e.target.value); setPage(0); }} className="bg-transparent border-none outline-none text-xs text-gray-600 dark:text-gray-300 py-2">
                <option value="">All Status</option>
                <option value="open">Open</option>
                <option value="acknowledged">Acknowledged</option>
                <option value="resolved">Resolved</option>
              </select>
            </div>
            <select value={filterSeverity} onChange={(e) => { setFilterSeverity(e.target.value); setPage(0); }} className="bg-gray-100 dark:bg-gray-800 border-none rounded-xl px-3 py-2 text-xs text-gray-600 dark:text-gray-300 outline-none">
              <option value="">All Severity</option>
              <option value="critical">Critical</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>
          </div>
        </div>

        <div className="space-y-3">
          {paginated.length === 0 && (
            <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700">
              <EmptyState
                title="No alerts found"
                description="Try adjusting your search or filter criteria"
                icon={Bell}
              />
            </div>
          )}
          {paginated.map((alert, i) => {
            const cp = checkpoints.find((c) => c.id === alert.checkpointId);
            const fac = facilities.find((f) => f.id === alert.facilityId);
            return (
              <motion.div
                key={alert.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.03 }}
                className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 hover:shadow-md transition-all duration-200"
              >
                <div className="flex flex-col sm:flex-row sm:items-start gap-3">
                  <div className="flex items-center gap-2">
                    <SeverityBadge severity={alert.severity} />
                    <StatusBadge status={alert.status} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 dark:text-white">{alert.message}</p>
                    <div className="flex flex-wrap items-center gap-3 mt-1.5 text-[10px] text-gray-400">
                      <span className="flex items-center gap-1"><Thermometer className="w-3 h-3" />{alert.temperature}° (range: {alert.tempMin}–{alert.tempMax}°)</span>
                      <span>{fac?.name} → {cp?.name}</span>
                      <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{formatDistanceToNow(new Date(alert.createdAt), { addSuffix: true })}</span>
                    </div>
                    {alert.acknowledgedBy && (
                      <p className="text-[10px] text-gray-400 mt-1">Acknowledged by {alert.acknowledgedBy} {alert.acknowledgedAt && format(new Date(alert.acknowledgedAt), "MMM d, h:mm a")}</p>
                    )}
                  </div>
                  {alert.status !== "resolved" && (
                    <div className="flex gap-2 shrink-0">
                      {alert.status === "open" && (
                        <button
                          onClick={() => updateAlertStatus(alert.id, "acknowledged")}
                          className="px-3 py-1.5 rounded-lg bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300 text-xs font-semibold hover:bg-amber-200 dark:hover:bg-amber-900/60 transition-colors"
                        >
                          Acknowledge
                        </button>
                      )}
                      <button
                        onClick={() => updateAlertStatus(alert.id, "resolved")}
                        className="px-3 py-1.5 rounded-lg bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 text-xs font-semibold hover:bg-emerald-200 dark:hover:bg-emerald-900/60 transition-colors"
                      >
                        Resolve
                      </button>
                    </div>
                  )}
                </div>
              </motion.div>
            );
          })}
        </div>

        {totalPages > 1 && (
          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-400">Page {page + 1} of {totalPages}</span>
            <div className="flex gap-1">
              <button onClick={() => setPage(Math.max(0, page - 1))} disabled={page === 0} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-30 transition-colors"><ChevronLeft className="w-4 h-4 text-gray-500" /></button>
              <button onClick={() => setPage(Math.min(totalPages - 1, page + 1))} disabled={page >= totalPages - 1} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-30 transition-colors"><ChevronRight className="w-4 h-4 text-gray-500" /></button>
            </div>
          </div>
        )}
      </div>
    </PageTransition>
  );
}
