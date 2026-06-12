import { useStore } from "@/store";
import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import PageTransition from "@/components/PageTransition";
import { HazardBadge, ActiveBadge } from "@/components/Badge";
import EmptyState from "@/components/EmptyState";
import { Plus, X, Search, ChevronUp, ChevronDown, Filter, ShieldCheck, Lightbulb } from "lucide-react";
import type { HazardType, MonitoringFrequency, TemperatureUnit } from "@/store/types";

type SortKey = "name" | "hazardType" | "status" | "tempMin";
type SortDir = "asc" | "desc";

export default function Checkpoints() {
  const { checkpoints, facilities, addCheckpoint, updateCheckpoint, hasPermission } = useStore();
  const canCreate = hasPermission("create_checkpoints");
  const canEdit = hasPermission("edit_checkpoints");
  const [showModal, setShowModal] = useState(false);
  const [search, setSearch] = useState("");
  const [filterFacility, setFilterFacility] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("name");
  const [sortDir, setSortDir] = useState<SortDir>("asc");

  const [form, setForm] = useState({
    facilityId: "",
    name: "",
    hazardType: "biological" as HazardType,
    monitoringFrequency: "every-2-hours" as MonitoringFrequency,
    tempMin: 33,
    tempMax: 40,
    unit: "F" as TemperatureUnit,
  });

  const filtered = useMemo(() => {
    let list = [...checkpoints];
    if (search) list = list.filter((c) => c.name.toLowerCase().includes(search.toLowerCase()));
    if (filterFacility) list = list.filter((c) => c.facilityId === filterFacility);
    if (filterStatus) list = list.filter((c) => c.status === filterStatus);
    list.sort((a, b) => {
      const aVal = a[sortKey];
      const bVal = b[sortKey];
      if (typeof aVal === "string" && typeof bVal === "string") {
        return sortDir === "asc" ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
      }
      return sortDir === "asc" ? Number(aVal) - Number(bVal) : Number(bVal) - Number(aVal);
    });
    return list;
  }, [checkpoints, search, filterFacility, filterStatus, sortKey, sortDir]);

  const handleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir(sortDir === "asc" ? "desc" : "asc");
    else { setSortKey(key); setSortDir("asc"); }
  };

  const SortIcon = ({ col }: { col: SortKey }) => {
    if (sortKey !== col) return <ChevronUp className="w-3 h-3 text-gray-300 dark:text-gray-600" />;
    return sortDir === "asc" ? <ChevronUp className="w-3 h-3 text-emerald-500" /> : <ChevronDown className="w-3 h-3 text-emerald-500" />;
  };

  const handleSubmit = async () => {
    if (!form.name.trim() || !form.facilityId) return;
    await addCheckpoint({ ...form, status: "active" });
    setShowModal(false);
    setForm({ facilityId: "", name: "", hazardType: "biological", monitoringFrequency: "every-2-hours", tempMin: 33, tempMax: 40, unit: "F" });
  };

  return (
    <PageTransition>
      <div className="p-4 lg:p-6 space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <p className="text-sm text-gray-500 dark:text-gray-400">Monitor and manage safety checkpoints</p>
          {canCreate && (
            <button
              onClick={() => setShowModal(true)}
              className="flex items-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-semibold transition-all duration-200 shadow-md shadow-emerald-600/20 hover:shadow-lg hover:-translate-y-0.5"
            >
              <Plus className="w-4 h-4" />
              Add Checkpoint
            </button>
          )}
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex items-center gap-2 bg-gray-100 dark:bg-gray-800 rounded-xl px-3 py-2 flex-1">
            <Search className="w-4 h-4 text-gray-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search checkpoints..."
              className="bg-transparent border-none outline-none text-sm text-gray-700 dark:text-gray-300 w-full"
            />
          </div>
          <div className="flex gap-2">
            <div className="flex items-center gap-1.5 bg-gray-100 dark:bg-gray-800 rounded-xl px-3">
              <Filter className="w-3.5 h-3.5 text-gray-400" />
              <select
                value={filterFacility}
                onChange={(e) => setFilterFacility(e.target.value)}
                className="bg-transparent border-none outline-none text-xs text-gray-600 dark:text-gray-300 py-2"
              >
                <option value="">All Facilities</option>
                {facilities.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}
              </select>
            </div>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="bg-gray-100 dark:bg-gray-800 border-none rounded-xl px-3 py-2 text-xs text-gray-600 dark:text-gray-300 outline-none"
            >
              <option value="">All Status</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100 dark:border-gray-700">
                  {([
                    ["name", "Checkpoint"],
                    ["hazardType", "Hazard"],
                    ["tempMin", "Temp Range"],
                    ["status", "Status"],
                  ] as [SortKey, string][]).map(([key, label]) => (
                    <th
                      key={key}
                      onClick={() => handleSort(key)}
                      className="px-6 py-3 text-left text-[10px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer hover:text-gray-700 dark:hover:text-gray-200 transition-colors"
                    >
                      <span className="flex items-center gap-1">
                        {label}
                        <SortIcon col={key} />
                      </span>
                    </th>
                  ))}
                  <th className="px-6 py-3 text-left text-[10px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Frequency</th>
                  <th className="px-6 py-3 text-right text-[10px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50 dark:divide-gray-700/50">
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-6 py-0">
                      <EmptyState
                        title="No checkpoints found"
                        description="Try adjusting your filters or create a new checkpoint"
                        icon={ShieldCheck}
                        action={canCreate ? { label: "Add Checkpoint", onClick: () => setShowModal(true) } : undefined}
                      />
                    </td>
                  </tr>
                )}
                {filtered.map((cp, i) => {
                  const fac = facilities.find((f) => f.id === cp.facilityId);
                  return (
                    <motion.tr
                      key={cp.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: i * 0.02 }}
                      className="hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors"
                    >
                      <td className="px-6 py-3.5">
                        <p className="text-sm font-medium text-gray-900 dark:text-white">{cp.name}</p>
                        <p className="text-[10px] text-gray-400">{fac?.name}</p>
                      </td>
                      <td className="px-6 py-3.5"><HazardBadge type={cp.hazardType} /></td>
                      <td className="px-6 py-3.5">
                        <span className="text-sm font-mono text-gray-700 dark:text-gray-300">{cp.tempMin}° – {cp.tempMax}°{cp.unit}</span>
                      </td>
                      <td className="px-6 py-3.5"><ActiveBadge active={cp.status === "active"} /></td>
                      <td className="px-6 py-3.5">
                        <span className="text-xs text-gray-500 dark:text-gray-400 capitalize">{cp.monitoringFrequency.replace(/-/g, " ")}</span>
                      </td>
                      <td className="px-6 py-3.5 text-right">
                        {canEdit ? (
                          <button
                            onClick={() => updateCheckpoint(cp.id, { status: cp.status === "active" ? "inactive" : "active" })}
                            className="text-xs text-emerald-600 dark:text-emerald-400 font-semibold hover:text-emerald-700 transition-colors"
                          >
                            {cp.status === "active" ? "Deactivate" : "Activate"}
                          </button>
                        ) : (
                          <span className="text-xs text-gray-400">—</span>
                        )}
                      </td>
                    </motion.tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {showModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setShowModal(false)} />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              className="relative bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-lg p-6 z-10 max-h-[90vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-bold text-gray-900 dark:text-white">Add Checkpoint</h3>
                <button onClick={() => setShowModal(false)} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
                  <X className="w-5 h-5 text-gray-400" />
                </button>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5">Facility</label>
                  <select value={form.facilityId} onChange={(e) => setForm({ ...form, facilityId: e.target.value })} className="w-full px-3 py-2.5 rounded-xl border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-emerald-500 outline-none transition-all">
                    <option value="">Select facility...</option>
                    {facilities.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5">Checkpoint Name</label>
                  <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g., Walk-in Cooler A" className="w-full px-3 py-2.5 rounded-xl border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-emerald-500 outline-none transition-all" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5">Hazard Type</label>
                    <select value={form.hazardType} onChange={(e) => setForm({ ...form, hazardType: e.target.value as HazardType })} className="w-full px-3 py-2.5 rounded-xl border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-emerald-500 outline-none transition-all">
                      <option value="biological">Biological</option>
                      <option value="chemical">Chemical</option>
                      <option value="physical">Physical</option>
                      <option value="allergen">Allergen</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5">Monitoring Frequency</label>
                    <select value={form.monitoringFrequency} onChange={(e) => setForm({ ...form, monitoringFrequency: e.target.value as MonitoringFrequency })} className="w-full px-3 py-2.5 rounded-xl border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-emerald-500 outline-none transition-all">
                      <option value="hourly">Hourly</option>
                      <option value="every-2-hours">Every 2 Hours</option>
                      <option value="every-4-hours">Every 4 Hours</option>
                      <option value="daily">Daily</option>
                      <option value="weekly">Weekly</option>
                    </select>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5">Min Temp</label>
                    <input type="number" value={form.tempMin} onChange={(e) => setForm({ ...form, tempMin: Number(e.target.value) })} className="w-full px-3 py-2.5 rounded-xl border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-emerald-500 outline-none transition-all" />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5">Max Temp</label>
                    <input type="number" value={form.tempMax} onChange={(e) => setForm({ ...form, tempMax: Number(e.target.value) })} className="w-full px-3 py-2.5 rounded-xl border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-emerald-500 outline-none transition-all" />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5">Unit</label>
                    <select value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value as TemperatureUnit })} className="w-full px-3 py-2.5 rounded-xl border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-emerald-500 outline-none transition-all">
                      <option value="F">°F</option>
                      <option value="C">°C</option>
                    </select>
                  </div>
                </div>
                <div className="p-3 bg-sky-50 dark:bg-sky-900/20 rounded-xl">
                  <p className="text-xs text-sky-700 dark:text-sky-300 font-medium flex items-center gap-1.5"><Lightbulb className="w-3.5 h-3.5 shrink-0" /> Common ranges: Walk-in cooler 33–40°F, Freezer -10–0°F, Prep station 33–41°F</p>
                </div>
              </div>
              <div className="flex gap-3 mt-6">
                <button onClick={() => setShowModal(false)} className="flex-1 px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-600 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">Cancel</button>
                <button onClick={handleSubmit} className="flex-1 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold transition-all shadow-md shadow-emerald-600/20">Create Checkpoint</button>
              </div>
            </motion.div>
          </div>
        )}
      </div>
    </PageTransition>
  );
}
