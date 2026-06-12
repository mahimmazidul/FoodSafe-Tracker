import { useStore } from "@/store";
import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import PageTransition from "@/components/PageTransition";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar, PieChart, Pie, Cell, RadialBarChart, RadialBar,
} from "recharts";
import { format, subDays, startOfDay } from "date-fns";
import { TrendingUp, Award, AlertTriangle, Users } from "lucide-react";

export default function Analytics() {
  const { temperatureLogs, checkpoints, facilities, reports, darkMode, hasPermission } = useStore();
  const [period, setPeriod] = useState(30);

  const canView = hasPermission("view_analytics");

  if (!canView) {
    return (
      <PageTransition>
        <div className="p-4 lg:p-6 flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="w-16 h-16 mx-auto rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center mb-4">
              <TrendingUp className="w-8 h-8 text-red-500" />
            </div>
            <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-2">Access Denied</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">You don't have permission to view analytics.</p>
          </div>
        </div>
      </PageTransition>
    );
  }

  const complianceTrend = useMemo(() => {
    const days: { date: string; score: number; readings: number }[] = [];
    for (let i = period - 1; i >= 0; i--) {
      const day = startOfDay(subDays(new Date(), i));
      const nextDay = startOfDay(subDays(new Date(), i - 1));
      const dayLogs = temperatureLogs.filter((l) => {
        const d = new Date(l.recordedAt);
        return d >= day && d < nextDay;
      });
      const compliant = dayLogs.filter((l) => l.isWithinRange).length;
      const score = dayLogs.length > 0 ? Math.round((compliant / dayLogs.length) * 100) : 100;
      days.push({ date: format(day, period > 14 ? "M/d" : "MMM d"), score, readings: dayLogs.length });
    }
    return days;
  }, [temperatureLogs, period]);

  const hazardBreakdown = useMemo(() => {
    const counts: Record<string, number> = {};
    const violations = temperatureLogs.filter((l) => !l.isWithinRange);
    violations.forEach((l) => {
      const cp = checkpoints.find((c) => c.id === l.checkpointId);
      if (cp) counts[cp.hazardType] = (counts[cp.hazardType] || 0) + 1;
    });
    const colors: Record<string, string> = { biological: "#8b5cf6", chemical: "#f97316", physical: "#3b82f6", allergen: "#ec4899" };
    return Object.entries(counts).map(([type, value]) => ({ name: type, value, color: colors[type] || "#6b7280" }));
  }, [temperatureLogs, checkpoints]);

  const checkpointRanking = useMemo(() => {
    return checkpoints
      .filter((c) => c.status === "active")
      .map((cp) => {
        const cpLogs = temperatureLogs.filter((l) => l.checkpointId === cp.id);
        const violations = cpLogs.filter((l) => !l.isWithinRange).length;
        const rate = cpLogs.length > 0 ? Math.round(((cpLogs.length - violations) / cpLogs.length) * 100) : 100;
        const fac = facilities.find((f) => f.id === cp.facilityId);
        return { name: cp.name, facility: fac?.name || "", rate, violations, total: cpLogs.length };
      })
      .sort((a, b) => a.rate - b.rate)
      .slice(0, 8);
  }, [checkpoints, temperatureLogs, facilities]);

  const facilityGauges = useMemo(() => {
    return facilities.map((fac) => {
      const report = reports.find((r) => r.facilityId === fac.id);
      return { name: fac.name, score: report?.complianceScore || 100, fill: (report?.complianceScore || 100) >= 95 ? "#10b981" : (report?.complianceScore || 100) >= 85 ? "#f59e0b" : "#ef4444" };
    });
  }, [facilities, reports]);

  const staffPerformance = useMemo(() => {
    const staff: Record<string, { total: number; compliant: number }> = {};
    temperatureLogs.forEach((l) => {
      if (!staff[l.recordedBy]) staff[l.recordedBy] = { total: 0, compliant: 0 };
      staff[l.recordedBy].total++;
      if (l.isWithinRange) staff[l.recordedBy].compliant++;
    });
    return Object.entries(staff)
      .map(([name, data]) => ({ name, total: data.total, rate: Math.round((data.compliant / data.total) * 100) }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 5);
  }, [temperatureLogs]);

  const heatmapData = useMemo(() => {
    const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    const grid: { day: string; hour: number; violations: number }[] = [];
    for (let d = 0; d < 7; d++) {
      for (let h = 6; h < 22; h++) {
        const violations = temperatureLogs.filter((l) => {
          const date = new Date(l.recordedAt);
          return date.getDay() === d && date.getHours() === h && !l.isWithinRange;
        }).length;
        grid.push({ day: days[d], hour: h, violations });
      }
    }
    return { grid, days, hours: Array.from({ length: 16 }, (_, i) => i + 6) };
  }, [temperatureLogs]);

  const tooltipStyle = {
    backgroundColor: darkMode ? "#1f2937" : "#fff",
    border: `1px solid ${darkMode ? "#374151" : "#e5e7eb"}`,
    borderRadius: "12px",
    fontSize: "12px",
    boxShadow: "0 10px 25px rgba(0,0,0,0.1)",
  };

  return (
    <PageTransition>
      <div className="p-4 lg:p-6 space-y-6">
        <div className="flex items-center justify-between">
          <p className="text-sm text-gray-500 dark:text-gray-400">Deep insights into your compliance data</p>
          <div className="flex bg-gray-100 dark:bg-gray-800 rounded-xl p-0.5">
            {[7, 14, 30, 90].map((p) => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  period === p
                    ? "bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm"
                    : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
                }`}
              >
                {p}d
              </button>
            ))}
          </div>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-6"
        >
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-sm font-bold text-gray-900 dark:text-white flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-emerald-500" />
                Compliance Score Trend
              </h3>
              <p className="text-xs text-gray-400 mt-0.5">Daily compliance percentage over {period} days</p>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={280}>
            <AreaChart data={complianceTrend}>
              <defs>
                <linearGradient id="gradScore" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke={darkMode ? "#374151" : "#f3f4f6"} />
              <XAxis dataKey="date" tick={{ fontSize: 10, fill: darkMode ? "#9ca3af" : "#6b7280" }} axisLine={false} tickLine={false} />
              <YAxis domain={[70, 100]} tick={{ fontSize: 10, fill: darkMode ? "#9ca3af" : "#6b7280" }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={tooltipStyle} />
              <Area type="monotone" dataKey="score" stroke="#10b981" strokeWidth={2.5} fill="url(#gradScore)" name="Compliance %" />
            </AreaChart>
          </ResponsiveContainer>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-6"
          >
            <h3 className="text-sm font-bold text-gray-900 dark:text-white flex items-center gap-2 mb-1">
              <AlertTriangle className="w-4 h-4 text-amber-500" />
              Violations by Hazard Type
            </h3>
            <p className="text-xs text-gray-400 mb-4">Distribution of violations</p>
            {hazardBreakdown.length > 0 ? (
              <>
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie data={hazardBreakdown} cx="50%" cy="50%" innerRadius={45} outerRadius={75} paddingAngle={4} dataKey="value" strokeWidth={0}>
                      {hazardBreakdown.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                    </Pie>
                    <Tooltip contentStyle={tooltipStyle} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="flex flex-wrap justify-center gap-3 mt-2">
                  {hazardBreakdown.map((d) => (
                    <span key={d.name} className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400 capitalize">
                      <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: d.color }} />
                      {d.name} ({d.value})
                    </span>
                  ))}
                </div>
              </>
            ) : (
              <div className="py-10 text-center text-sm text-gray-400">No violation data</div>
            )}
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-6"
          >
            <h3 className="text-sm font-bold text-gray-900 dark:text-white flex items-center gap-2 mb-1">
              <Award className="w-4 h-4 text-violet-500" />
              Facility Compliance Gauges
            </h3>
            <p className="text-xs text-gray-400 mb-4">Current scores by facility</p>
            <ResponsiveContainer width="100%" height={200}>
              <RadialBarChart cx="50%" cy="50%" innerRadius="30%" outerRadius="90%" barSize={14} data={facilityGauges} startAngle={180} endAngle={0}>
                <RadialBar background dataKey="score" cornerRadius={8} />
                <Tooltip contentStyle={tooltipStyle} />
              </RadialBarChart>
            </ResponsiveContainer>
            <div className="flex flex-wrap justify-center gap-3 mt-2">
              {facilityGauges.map((f) => (
                <span key={f.name} className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400">
                  <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: f.fill }} />
                  {f.name} ({f.score}%)
                </span>
              ))}
            </div>
          </motion.div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-6"
          >
            <h3 className="text-sm font-bold text-gray-900 dark:text-white mb-1">Most Problematic Checkpoints</h3>
            <p className="text-xs text-gray-400 mb-4">Ranked by compliance rate (lowest first)</p>
            <div className="space-y-3">
              {checkpointRanking.map((cp, i) => (
                <div key={cp.name} className="flex items-center gap-3">
                  <span className={`w-6 h-6 rounded-lg flex items-center justify-center text-[10px] font-bold ${
                    i < 3 ? "bg-red-100 text-red-600 dark:bg-red-900/40 dark:text-red-400" : "bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400"
                  }`}>{i + 1}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-gray-800 dark:text-gray-200 truncate">{cp.name}</p>
                    <p className="text-[10px] text-gray-400">{cp.facility}</p>
                  </div>
                  <div className="w-24 h-2 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        cp.rate >= 95 ? "bg-emerald-500" : cp.rate >= 85 ? "bg-amber-500" : "bg-red-500"
                      }`}
                      style={{ width: `${cp.rate}%` }}
                    />
                  </div>
                  <span className="text-xs font-mono font-semibold text-gray-700 dark:text-gray-300 w-10 text-right">{cp.rate}%</span>
                </div>
              ))}
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-6"
          >
            <h3 className="text-sm font-bold text-gray-900 dark:text-white flex items-center gap-2 mb-1">
              <Users className="w-4 h-4 text-sky-500" />
              Staff Performance
            </h3>
            <p className="text-xs text-gray-400 mb-4">Readings logged per team member</p>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={staffPerformance} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke={darkMode ? "#374151" : "#f3f4f6"} horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 10, fill: darkMode ? "#9ca3af" : "#6b7280" }} axisLine={false} tickLine={false} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 11, fill: darkMode ? "#9ca3af" : "#6b7280" }} axisLine={false} tickLine={false} width={100} />
                <Tooltip contentStyle={tooltipStyle} />
                <Bar dataKey="total" fill="#10b981" radius={[0, 6, 6, 0]} name="Readings" />
              </BarChart>
            </ResponsiveContainer>
          </motion.div>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-6"
        >
          <h3 className="text-sm font-bold text-gray-900 dark:text-white mb-1">Violation Heatmap</h3>
          <p className="text-xs text-gray-400 mb-4">Violations by day of week and hour — spot patterns at a glance</p>
          <div className="overflow-x-auto">
            <div className="min-w-[600px]">
              <div className="flex items-center gap-1 mb-1 ml-12">
                {heatmapData.hours.map((h) => (
                  <span key={h} className="flex-1 text-center text-[9px] text-gray-400">{h > 12 ? `${h-12}p` : `${h}a`}</span>
                ))}
              </div>
              {heatmapData.days.map((day) => (
                <div key={day} className="flex items-center gap-1 mb-1">
                  <span className="w-10 text-right text-[10px] text-gray-500 dark:text-gray-400 font-medium pr-2">{day}</span>
                  {heatmapData.hours.map((hour) => {
                    const cell = heatmapData.grid.find((g) => g.day === day && g.hour === hour);
                    const v = cell?.violations || 0;
                    const intensity = v === 0 ? "bg-gray-100 dark:bg-gray-700" : v <= 2 ? "bg-amber-200 dark:bg-amber-800/50" : v <= 5 ? "bg-orange-300 dark:bg-orange-700/50" : "bg-red-400 dark:bg-red-600/50";
                    return (
                      <div
                        key={hour}
                        className={`flex-1 h-6 rounded ${intensity} transition-colors cursor-pointer hover:ring-2 hover:ring-emerald-500/50`}
                        title={`${day} ${hour}:00 — ${v} violation${v !== 1 ? "s" : ""}`}
                      />
                    );
                  })}
                </div>
              ))}
              <div className="flex items-center justify-end gap-2 mt-3">
                <span className="text-[10px] text-gray-400">Less</span>
                <div className="w-4 h-4 rounded bg-gray-100 dark:bg-gray-700" />
                <div className="w-4 h-4 rounded bg-amber-200 dark:bg-amber-800/50" />
                <div className="w-4 h-4 rounded bg-orange-300 dark:bg-orange-700/50" />
                <div className="w-4 h-4 rounded bg-red-400 dark:bg-red-600/50" />
                <span className="text-[10px] text-gray-400">More</span>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </PageTransition>
  );
}
