import { useStore } from "@/store";
import { useState } from "react";
import { motion } from "framer-motion";
import PageTransition from "@/components/PageTransition";
import { ComplianceBadge } from "@/components/Badge";
import { Building2, Plus, MapPin, Calendar, X } from "lucide-react";
import { format } from "date-fns";

export default function Facilities() {
  const { facilities, checkpoints, reports, temperatureLogs, addFacility, hasPermission } = useStore();
  const canCreate = hasPermission("create_facilities");
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ name: "", address: "", type: "Restaurant" });

  const handleSubmit = async () => {
    if (!form.name.trim() || !form.address.trim()) return;
    await addFacility(form);
    setForm({ name: "", address: "", type: "Restaurant" });
    setShowModal(false);
  };

  return (
    <PageTransition>
      <div className="p-4 lg:p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-500 dark:text-gray-400">Manage your food service locations</p>
          </div>
          {canCreate && (
            <button
              onClick={() => setShowModal(true)}
              className="flex items-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-semibold transition-all duration-200 shadow-md shadow-emerald-600/20 hover:shadow-lg hover:shadow-emerald-600/30 hover:-translate-y-0.5"
            >
              <Plus className="w-4 h-4" />
              Add Facility
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {facilities.map((fac, i) => {
            const facCps = checkpoints.filter((c) => c.facilityId === fac.id);
            const activeCps = facCps.filter((c) => c.status === "active").length;
            const report = reports.find((r) => r.facilityId === fac.id);
            const recentLogs = temperatureLogs.filter((l) => l.facilityId === fac.id).slice(0, 50);
            const violations = recentLogs.filter((l) => !l.isWithinRange).length;

            return (
              <motion.div
                key={fac.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.08 }}
                className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-6 hover:shadow-lg hover:shadow-gray-200/50 dark:hover:shadow-gray-900/50 transition-all duration-300 hover:-translate-y-0.5 group"
              >
                <div className="flex items-start gap-3 mb-4">
                  <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-emerald-100 to-emerald-200 dark:from-emerald-800/40 dark:to-emerald-700/40 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform duration-300">
                    <Building2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-base font-bold text-gray-900 dark:text-white truncate">{fac.name}</h3>
                    <span className="text-[10px] font-semibold uppercase tracking-wide text-gray-400 bg-gray-100 dark:bg-gray-700 px-2 py-0.5 rounded-full">{fac.type}</span>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400 mb-1">
                  <MapPin className="w-3.5 h-3.5" />
                  <span className="truncate">{fac.address}</span>
                </div>
                <div className="flex items-center gap-1.5 text-xs text-gray-400 mb-4">
                  <Calendar className="w-3.5 h-3.5" />
                  <span>Added {format(new Date(fac.createdAt), "MMM d, yyyy")}</span>
                </div>

                <div className="grid grid-cols-3 gap-3 py-3 border-t border-gray-100 dark:border-gray-700">
                  <div className="text-center">
                    <p className="text-lg font-bold text-gray-900 dark:text-white">{activeCps}</p>
                    <p className="text-[10px] text-gray-400">Active CPs</p>
                  </div>
                  <div className="text-center">
                    <p className="text-lg font-bold text-gray-900 dark:text-white">{recentLogs.length}</p>
                    <p className="text-[10px] text-gray-400">Readings</p>
                  </div>
                  <div className="text-center">
                    <p className={`text-lg font-bold ${violations > 0 ? "text-red-600 dark:text-red-400" : "text-emerald-600 dark:text-emerald-400"}`}>{violations}</p>
                    <p className="text-[10px] text-gray-400">Violations</p>
                  </div>
                </div>

                {report && (
                  <div className="pt-3 border-t border-gray-100 dark:border-gray-700 flex items-center justify-between">
                    <span className="text-xs text-gray-500 dark:text-gray-400">Compliance</span>
                    <ComplianceBadge score={report.complianceScore} />
                  </div>
                )}
              </motion.div>
            );
          })}
        </div>

        {showModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="absolute inset-0 bg-black/50 backdrop-blur-sm"
              onClick={() => setShowModal(false)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              className="relative bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-md p-6 z-10"
            >
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-bold text-gray-900 dark:text-white">Add Facility</h3>
                <button onClick={() => setShowModal(false)} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
                  <X className="w-5 h-5 text-gray-400" />
                </button>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5">Facility Name</label>
                  <input
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    placeholder="e.g., Downtown Kitchen"
                    className="w-full px-3 py-2.5 rounded-xl border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none transition-all"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5">Address</label>
                  <input
                    value={form.address}
                    onChange={(e) => setForm({ ...form, address: e.target.value })}
                    placeholder="123 Main St, City, State"
                    className="w-full px-3 py-2.5 rounded-xl border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none transition-all"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5">Type</label>
                  <select
                    value={form.type}
                    onChange={(e) => setForm({ ...form, type: e.target.value })}
                    className="w-full px-3 py-2.5 rounded-xl border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none transition-all"
                  >
                    <option>Restaurant</option>
                    <option>Market</option>
                    <option>Bakery</option>
                    <option>Catering</option>
                    <option>Food Truck</option>
                    <option>Warehouse</option>
                  </select>
                </div>
              </div>
              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => setShowModal(false)}
                  className="flex-1 px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-600 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSubmit}
                  className="flex-1 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold transition-all shadow-md shadow-emerald-600/20"
                >
                  Add Facility
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </div>
    </PageTransition>
  );
}
