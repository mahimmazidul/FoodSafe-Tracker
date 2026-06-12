import { useStore } from "@/store";
import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import PageTransition from "@/components/PageTransition";
import EmptyState from "@/components/EmptyState";
import { TempBadge } from "@/components/Badge";
import { Plus, X, Search, Filter, Thermometer, ChevronLeft, ChevronRight, CheckCircle, AlertTriangle } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/utils/cn";

const PAGE_SIZE = 15;

export default function Temperature() {
  const { temperatureLogs, checkpoints, facilities, addTemperatureLog, currentUser, apiMode } = useStore();
  const [showModal, setShowModal] = useState(false);
  const [search, setSearch] = useState("");
  const [filterFacility, setFilterFacility] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [page, setPage] = useState(0);

  const [form, setForm] = useState({
    checkpointId: "",
    temperature: "",
    recordedBy: "",
    notes: "",
    correctiveAction: "",
  });

  const selectedCp = checkpoints.find((c) => c.id === form.checkpointId);
  const tempValue = parseFloat(form.temperature);
  const isWithinRange = selectedCp && !isNaN(tempValue) ? tempValue >= selectedCp.tempMin && tempValue <= selectedCp.tempMax : null;

  const filtered = useMemo(() => {
    let list = [...temperatureLogs];
    if (search) {
      list = list.filter((l) => {
        const cp = checkpoints.find((c) => c.id === l.checkpointId);
        return cp?.name.toLowerCase().includes(search.toLowerCase()) || l.recordedBy.toLowerCase().includes(search.toLowerCase());
      });
    }
    if (filterFacility) list = list.filter((l) => l.facilityId === filterFacility);
    if (filterStatus === "compliant") list = list.filter((l) => l.isWithinRange);
    if (filterStatus === "violation") list = list.filter((l) => !l.isWithinRange);
    return list;
  }, [temperatureLogs, checkpoints, search, filterFacility, filterStatus]);

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paginated = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  const handleSubmit = async () => {
    // In remote (backend) mode the server stamps the recorder from the JWT,
    // so the name field is optional there.
    const recorder = form.recordedBy || currentUser?.name || "";
    if (!form.checkpointId || !form.temperature || (apiMode === "local" && !recorder)) return;
    const cp = checkpoints.find((c) => c.id === form.checkpointId);
    if (!cp) return;
    const temp = Number(form.temperature);
    const withinRange = temp >= cp.tempMin && temp <= cp.tempMax;
    await addTemperatureLog({
      checkpointId: form.checkpointId,
      facilityId: cp.facilityId,
      temperature: temp,
      unit: cp.unit,
      isWithinRange: withinRange,
      recordedBy: recorder,
      recordedAt: new Date().toISOString(),
      notes: form.notes,
      correctiveAction: form.correctiveAction,
    });
    setShowModal(false);
    setForm({ checkpointId: "", temperature: "", recordedBy: "", notes: "", correctiveAction: "" });
  };

  return (
    <PageTransition>
      <div className="p-4 lg:p-6 space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <p className="text-sm text-gray-500 dark:text-gray-400">{filtered.length} temperature readings recorded</p>
          <button
            onClick={() => setShowModal(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-semibold transition-all duration-200 shadow-md shadow-emerald-600/20 hover:shadow-lg hover:-translate-y-0.5"
          >
            <Plus className="w-4 h-4" />
            Log Temperature
          </button>
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex items-center gap-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2 flex-1 focus-within:ring-2 focus-within:ring-emerald-500 focus-within:border-transparent transition-all">
            <Search className="w-4 h-4 text-gray-400" />
            <input value={search} onChange={(e) => { setSearch(e.target.value); setPage(0); }} placeholder="Search by checkpoint or staff..." className="bg-transparent border-none outline-none text-sm text-gray-700 dark:text-gray-300 w-full" />
          </div>
          <div className="flex gap-2">
            <div className="flex items-center gap-1.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-3">
              <Filter className="w-3.5 h-3.5 text-gray-400" />
              <select value={filterFacility} onChange={(e) => { setFilterFacility(e.target.value); setPage(0); }} className="bg-transparent border-none outline-none text-xs text-gray-600 dark:text-gray-300 py-2 pr-6">
                <option value="">All Facilities</option>
                {facilities.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}
              </select>
            </div>
            <select value={filterStatus} onChange={(e) => { setFilterStatus(e.target.value); setPage(0); }} className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2 text-xs text-gray-600 dark:text-gray-300 outline-none focus:ring-2 focus:ring-emerald-500">
              <option value="">All Readings</option>
              <option value="compliant">Compliant</option>
              <option value="violation">Violations</option>
            </select>
          </div>
        </div>

        <div className="hidden md:block bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100 dark:border-gray-700">
                  <th className="px-6 py-3 text-left text-[10px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Checkpoint</th>
                  <th className="px-6 py-3 text-left text-[10px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Temperature</th>
                  <th className="px-6 py-3 text-left text-[10px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Range</th>
                  <th className="px-6 py-3 text-left text-[10px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Recorded By</th>
                  <th className="px-6 py-3 text-left text-[10px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Time</th>
                  <th className="px-6 py-3 text-left text-[10px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Notes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50 dark:divide-gray-700/50">
                {paginated.length === 0 && (
                  <tr><td colSpan={6} className="px-6 py-0">
                    <EmptyState
                      title="No readings found"
                      description="Log your first temperature reading to get started"
                      icon={Thermometer}
                      action={{ label: "Log Temperature", onClick: () => setShowModal(true) }}
                    />
                  </td></tr>
                )}
                {paginated.map((log, i) => {
                  const cp = checkpoints.find((c) => c.id === log.checkpointId);
                  const fac = facilities.find((f) => f.id === log.facilityId);
                  return (
                    <motion.tr
                      key={log.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: i * 0.02 }}
                      className="hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors"
                    >
                      <td className="px-6 py-3">
                        <p className="text-sm font-medium text-gray-900 dark:text-white">{cp?.name || "Unknown"}</p>
                        <p className="text-[10px] text-gray-400">{fac?.name}</p>
                      </td>
                      <td className="px-6 py-3">
                        <TempBadge temp={log.temperature} min={cp?.tempMin || 0} max={cp?.tempMax || 100} unit={log.unit} />
                      </td>
                      <td className="px-6 py-3">
                        <span className="text-xs font-mono text-gray-500 dark:text-gray-400">{cp?.tempMin}° – {cp?.tempMax}°{log.unit}</span>
                      </td>
                      <td className="px-6 py-3 text-sm text-gray-700 dark:text-gray-300">{log.recordedBy}</td>
                      <td className="px-6 py-3 text-xs text-gray-500 dark:text-gray-400">{format(new Date(log.recordedAt), "MMM d, h:mm a")}</td>
                      <td className="px-6 py-3 text-xs text-gray-500 dark:text-gray-400 max-w-[150px] truncate">{log.notes || "—"}</td>
                    </motion.tr>
                  );
                })}
              </tbody>
            </table>
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

        <div className="md:hidden space-y-3">
          {paginated.length === 0 && (
            <EmptyState
              title="No readings found"
              description="Log your first temperature reading to get started"
              icon={Thermometer}
              action={{ label: "Log Temperature", onClick: () => setShowModal(true) }}
            />
          )}
          {paginated.map((log) => {
            const cp = checkpoints.find((c) => c.id === log.checkpointId);
            const fac = facilities.find((f) => f.id === log.facilityId);
            return (
              <motion.div
                key={log.id}
                whileHover={{ y: -2 }}
                className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 shadow-sm hover:shadow-md transition-all"
              >
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <p className="text-sm font-medium text-gray-900 dark:text-white">{cp?.name}</p>
                    <p className="text-[10px] text-gray-400">{fac?.name}</p>
                  </div>
                  <TempBadge temp={log.temperature} min={cp?.tempMin || 0} max={cp?.tempMax || 100} unit={log.unit} />
                </div>
                <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
                  <span>{log.recordedBy}</span>
                  <span>{format(new Date(log.recordedAt), "MMM d, h:mm a")}</span>
                </div>
              </motion.div>
            );
          })}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 pt-2">
              <button onClick={() => setPage(Math.max(0, page - 1))} disabled={page === 0} className="px-3 py-1.5 rounded-lg bg-gray-100 dark:bg-gray-800 text-xs disabled:opacity-30">Previous</button>
              <span className="text-xs text-gray-400">{page + 1} / {totalPages}</span>
              <button onClick={() => setPage(Math.min(totalPages - 1, page + 1))} disabled={page >= totalPages - 1} className="px-3 py-1.5 rounded-lg bg-gray-100 dark:bg-gray-800 text-xs disabled:opacity-30">Next</button>
            </div>
          )}
        </div>

        {showModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setShowModal(false)} />
            <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} className="relative bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-md p-6 z-10 max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-bold text-gray-900 dark:text-white">Log Temperature</h3>
                <button onClick={() => setShowModal(false)} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"><X className="w-5 h-5 text-gray-400" /></button>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5">Checkpoint</label>
                  <select value={form.checkpointId} onChange={(e) => setForm({ ...form, checkpointId: e.target.value })} className="w-full px-3 py-2.5 rounded-xl border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700/50 text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-emerald-500 outline-none transition-all">
                    <option value="">Select checkpoint...</option>
                    {checkpoints.filter((c) => c.status === "active").map((cp) => {
                      const fac = facilities.find((f) => f.id === cp.facilityId);
                      return <option key={cp.id} value={cp.id}>{cp.name} ({fac?.name})</option>;
                    })}
                  </select>
                </div>

                {selectedCp && (
                  <div className="p-3 bg-gray-50 dark:bg-gray-700/30 rounded-xl border border-gray-100 dark:border-gray-700">
                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Acceptable range:</p>
                    <p className="text-sm font-mono font-bold text-gray-800 dark:text-white">{selectedCp.tempMin}° – {selectedCp.tempMax}°{selectedCp.unit}</p>
                  </div>
                )}

                <div>
                  <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
                    Temperature
                    {isWithinRange !== null && (
                      <span className={cn("ml-2 inline-flex items-center gap-1 font-normal", isWithinRange ? "text-emerald-600" : "text-red-500")}>
                        {isWithinRange ? <CheckCircle className="w-3 h-3" /> : <X className="w-3 h-3" />}
                        {isWithinRange ? "Within range" : "Out of range"}
                      </span>
                    )}
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      step="0.1"
                      value={form.temperature}
                      onChange={(e) => setForm({ ...form, temperature: e.target.value })}
                      placeholder="e.g., 36.5"
                      className={cn(
                        "w-full px-3 py-2.5 rounded-xl border-2 text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-emerald-500 outline-none transition-all pr-10",
                        isWithinRange === null
                          ? "border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700/50"
                          : isWithinRange
                          ? "border-emerald-400 bg-emerald-50 dark:bg-emerald-900/20"
                          : "border-red-400 bg-red-50 dark:bg-red-900/20"
                      )}
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-gray-400">°{selectedCp?.unit || "F"}</span>
                  </div>
                  
                  {selectedCp && form.temperature && (
                    <div className="mt-3 bg-gray-50 dark:bg-gray-700/30 rounded-lg p-3">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-[10px] text-gray-400">{selectedCp.tempMin - 10}°</span>
                        <div className="flex-1 h-2 bg-gray-200 dark:bg-gray-600 rounded-full overflow-hidden relative">
                          <div
                            className="absolute h-full bg-emerald-400"
                            style={{
                              left: `${((selectedCp.tempMin - (selectedCp.tempMin - 10)) / ((selectedCp.tempMax + 10) - (selectedCp.tempMin - 10))) * 100}%`,
                              width: `${((selectedCp.tempMax - selectedCp.tempMin) / ((selectedCp.tempMax + 10) - (selectedCp.tempMin - 10))) * 100}%`,
                            }}
                          />
                          <div
                            className={cn(
                              "absolute w-3 h-3 rounded-full border-2 border-white shadow top-1/2 -translate-y-1/2 -translate-x-1/2 transition-all",
                              isWithinRange ? "bg-emerald-500" : "bg-red-500"
                            )}
                            style={{
                              left: `${Math.max(0, Math.min(100, ((tempValue - (selectedCp.tempMin - 10)) / ((selectedCp.tempMax + 10) - (selectedCp.tempMin - 10))) * 100))}%`,
                            }}
                          />
                        </div>
                        <span className="text-[10px] text-gray-400">{selectedCp.tempMax + 10}°</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-[10px]">
                        {isWithinRange ? (
                          <><CheckCircle className="w-3 h-3 text-emerald-500" /><span className="text-emerald-600 dark:text-emerald-400">Within acceptable range</span></>
                        ) : (
                          <><AlertTriangle className="w-3 h-3 text-red-500" /><span className="text-red-600 dark:text-red-400">{Math.abs(tempValue - (tempValue < selectedCp.tempMin ? selectedCp.tempMin : selectedCp.tempMax)).toFixed(1)}° outside range</span></>
                        )}
                      </div>
                    </div>
                  )}

                  <div className="flex flex-wrap gap-2 mt-3">
                    {[32, 35, 38, 40, 45].map((t) => (
                      <button
                        key={t}
                        type="button"
                        onClick={() => setForm({ ...form, temperature: String(t) })}
                        className={cn(
                          "px-3 py-1.5 rounded-lg text-xs font-mono font-medium transition-all",
                          form.temperature === String(t)
                            ? "bg-emerald-600 text-white shadow-md"
                            : "bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600"
                        )}
                      >
                        {t}°
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5">Recorded By</label>
                  <input value={form.recordedBy} onChange={(e) => setForm({ ...form, recordedBy: e.target.value })} placeholder={currentUser?.name || "Your name"} className="w-full px-3 py-2.5 rounded-xl border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700/50 text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-emerald-500 outline-none transition-all" />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5">Notes (optional)</label>
                  <textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={2} placeholder="Any observations..." className="w-full px-3 py-2.5 rounded-xl border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700/50 text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-emerald-500 outline-none transition-all resize-none" />
                </div>

                {isWithinRange === false && (
                  <div>
                    <label className="block text-xs font-semibold text-red-600 dark:text-red-400 mb-1.5">Corrective Action Required</label>
                    <textarea value={form.correctiveAction} onChange={(e) => setForm({ ...form, correctiveAction: e.target.value })} rows={2} placeholder="Describe the corrective action taken..." className="w-full px-3 py-2.5 rounded-xl border-2 border-red-300 dark:border-red-700 bg-red-50 dark:bg-red-900/20 text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-red-500 outline-none transition-all resize-none" />
                  </div>
                )}
              </div>
              <div className="flex gap-3 mt-6">
                <button onClick={() => setShowModal(false)} className="flex-1 px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-600 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">Cancel</button>
                <button
                  onClick={handleSubmit}
                  disabled={!form.checkpointId || !form.temperature || !form.recordedBy}
                  className="flex-1 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:bg-gray-300 dark:disabled:bg-gray-700 disabled:cursor-not-allowed text-white text-sm font-semibold transition-all shadow-md shadow-emerald-600/20"
                >
                  Log Reading
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </div>
    </PageTransition>
  );
}
