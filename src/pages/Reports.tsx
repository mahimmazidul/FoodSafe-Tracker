import { useStore } from "@/store";
import { useMemo } from "react";
import { motion } from "framer-motion";
import PageTransition from "@/components/PageTransition";
import { ComplianceBadge } from "@/components/Badge";
import { FileText, Download, RefreshCw, Building2, CheckCircle, CheckCircle2, AlertTriangle, BarChart3, Trophy } from "lucide-react";
import { format } from "date-fns";

export default function Reports() {
  const { reports, facilities, generateReport, hasPermission } = useStore();
  const canGenerate = hasPermission("generate_reports");

  const grouped = useMemo(() => {
    return facilities.map((fac) => ({
      facility: fac,
      reports: reports
        .filter((r) => r.facilityId === fac.id)
        .sort((a, b) => new Date(b.generatedAt).getTime() - new Date(a.generatedAt).getTime()),
    }));
  }, [facilities, reports]);

  const exportCSV = (report: typeof reports[0]) => {
    const fac = facilities.find((f) => f.id === report.facilityId);
    const csv = [
      "Field,Value",
      `Facility,${fac?.name}`,
      `Period,${format(new Date(report.periodStart), "yyyy-MM-dd")} to ${format(new Date(report.periodEnd), "yyyy-MM-dd")}`,
      `Total Checkpoints,${report.totalCheckpoints}`,
      `Compliant Checkpoints,${report.compliantCheckpoints}`,
      `Total Readings,${report.totalReadings}`,
      `Violations,${report.violations}`,
      `Compliance Score,${report.complianceScore}%`,
      `Generated,${format(new Date(report.generatedAt), "yyyy-MM-dd HH:mm")}`,
    ].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `compliance-report-${fac?.name?.replace(/\s+/g, "-").toLowerCase()}-${format(new Date(report.generatedAt), "yyyy-MM-dd")}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <PageTransition>
      <div className="p-4 lg:p-6 space-y-6">
        <div className="flex items-center justify-between">
          <p className="text-sm text-gray-500 dark:text-gray-400">Generate and export compliance reports</p>
        </div>

        {grouped.map(({ facility, reports: facReports }, fi) => (
          <motion.div
            key={facility.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: fi * 0.1 }}
            className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 overflow-hidden"
          >
            <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-100 to-emerald-200 dark:from-emerald-800/40 dark:to-emerald-700/40 flex items-center justify-center">
                  <Building2 className="w-4.5 h-4.5 text-emerald-600 dark:text-emerald-400" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-gray-900 dark:text-white">{facility.name}</h3>
                  <p className="text-[10px] text-gray-400">{facility.type} · {facility.address}</p>
                </div>
              </div>
              {canGenerate && (
                <button
                  onClick={() => generateReport(facility.id)}
                  className="flex items-center gap-2 px-3 py-2 bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 rounded-xl text-xs font-semibold hover:bg-emerald-100 dark:hover:bg-emerald-900/50 transition-colors"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  Generate New
                </button>
              )}
            </div>

            {facReports.length === 0 && (
              <div className="px-6 py-10 text-center">
                <FileText className="w-8 h-8 mx-auto mb-2 text-gray-300 dark:text-gray-600" />
                <p className="text-sm text-gray-400">No reports yet</p>
                <p className="text-xs text-gray-400 mt-1">Generate your first compliance report</p>
              </div>
            )}

            <div className="divide-y divide-gray-50 dark:divide-gray-700/50">
              {facReports.map((report) => (
                <div key={report.id} className="px-6 py-4 hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors">
                  <div className="flex flex-col lg:flex-row lg:items-center gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-xs text-gray-500 dark:text-gray-400">
                          {format(new Date(report.periodStart), "MMM d")} — {format(new Date(report.periodEnd), "MMM d, yyyy")}
                        </span>
                        <ComplianceBadge score={report.complianceScore} />
                      </div>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-lg bg-emerald-50 dark:bg-emerald-900/30 flex items-center justify-center">
                            <CheckCircle className="w-4 h-4 text-emerald-500" />
                          </div>
                          <div>
                            <p className="text-sm font-bold text-gray-900 dark:text-white">{report.compliantCheckpoints}/{report.totalCheckpoints}</p>
                            <p className="text-[10px] text-gray-400">Compliant CPs</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-lg bg-sky-50 dark:bg-sky-900/30 flex items-center justify-center">
                            <BarChart3 className="w-4 h-4 text-sky-500" />
                          </div>
                          <div>
                            <p className="text-sm font-bold text-gray-900 dark:text-white">{report.totalReadings}</p>
                            <p className="text-[10px] text-gray-400">Readings</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-lg bg-red-50 dark:bg-red-900/30 flex items-center justify-center">
                            <AlertTriangle className="w-4 h-4 text-red-500" />
                          </div>
                          <div>
                            <p className="text-sm font-bold text-gray-900 dark:text-white">{report.violations}</p>
                            <p className="text-[10px] text-gray-400">Violations</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                            report.complianceScore >= 95 ? "bg-emerald-50 dark:bg-emerald-900/30" :
                            report.complianceScore >= 85 ? "bg-amber-50 dark:bg-amber-900/30" :
                            "bg-red-50 dark:bg-red-900/30"
                          }`}>
                            {report.complianceScore >= 95 ? (
                              <Trophy className="w-4 h-4 text-emerald-500" />
                            ) : report.complianceScore >= 85 ? (
                              <CheckCircle2 className="w-4 h-4 text-amber-500" />
                            ) : (
                              <AlertTriangle className="w-4 h-4 text-red-500" />
                            )}
                          </div>
                          <div>
                            <p className="text-sm font-bold text-gray-900 dark:text-white">{report.complianceScore}%</p>
                            <p className="text-[10px] text-gray-400">Score</p>
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => exportCSV(report)}
                        className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-600 text-xs font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                      >
                        <Download className="w-3.5 h-3.5" />
                        CSV
                      </button>
                    </div>
                  </div>
                  <p className="text-[10px] text-gray-400 mt-2">Generated {format(new Date(report.generatedAt), "MMM d, yyyy 'at' h:mm a")}</p>
                </div>
              ))}
            </div>
          </motion.div>
        ))}
      </div>
    </PageTransition>
  );
}
