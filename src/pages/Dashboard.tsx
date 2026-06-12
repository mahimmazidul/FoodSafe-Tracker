import { useStore } from "@/store";
import { useMemo, useState, useEffect } from "react";
import { motion } from "framer-motion";
import PageTransition from "@/components/PageTransition";
import { CardSkeleton, ChartSkeleton } from "@/components/Skeleton";
import { SeverityBadge, ComplianceBadge } from "@/components/Badge";
import {
  Thermometer,
  ShieldCheck,
  AlertTriangle,
  TrendingUp,
  Building2,
  Clock,
  ArrowUpRight,
  ArrowDownRight,
} from "lucide-react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import { format, subDays, startOfDay, isAfter } from "date-fns";

function AnimatedNumber({ value, suffix = "" }: { value: number; suffix?: string }) {
  const [display, setDisplay] = useState(0);
  useEffect(() => {
    const duration = 600;
    const start = performance.now();
    const animate = (now: number) => {
      const progress = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplay(Math.round(value * eased));
      if (progress < 1) requestAnimationFrame(animate);
    };
    requestAnimationFrame(animate);
  }, [value]);
  return <span>{display}{suffix}</span>;
}

export default function Dashboard() {
  const { facilities, checkpoints, temperatureLogs, alerts, reports, setPage, darkMode } = useStore();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const t = setTimeout(() => setLoading(false), 600);
    return () => clearTimeout(t);
  }, []);

  const stats = useMemo(() => {
    const now = new Date();
    const day = subDays(now, 1);
    const week = subDays(now, 7);
    const recentLogs = temperatureLogs.filter((l) => isAfter(new Date(l.recordedAt), day));
    const weekLogs = temperatureLogs.filter((l) => isAfter(new Date(l.recordedAt), week));
    const violations24h = recentLogs.filter((l) => !l.isWithinRange).length;
    const openAlerts = alerts.filter((a) => a.status === "open").length;
    const avgCompliance = reports.length > 0
      ? Math.round(reports.reduce((s, r) => s + r.complianceScore, 0) / reports.length)
      : 100;
    const activeCheckpoints = checkpoints.filter((c) => c.status === "active").length;

    return {
      totalFacilities: facilities.length,
      activeCheckpoints,
      recentReadings: recentLogs.length,
      violations24h,
      openAlerts,
      avgCompliance,
      weeklyReadings: weekLogs.length,
    };
  }, [facilities, checkpoints, temperatureLogs, alerts, reports]);

  const chartData = useMemo(() => {
    const days: { date: string; compliant: number; violations: number }[] = [];
    for (let i = 13; i >= 0; i--) {
      const day = startOfDay(subDays(new Date(), i));
      const nextDay = startOfDay(subDays(new Date(), i - 1));
      const dayLogs = temperatureLogs.filter((l) => {
        const d = new Date(l.recordedAt);
        return d >= day && d < nextDay;
      });
      days.push({
        date: format(day, "MMM d"),
        compliant: dayLogs.filter((l) => l.isWithinRange).length,
        violations: dayLogs.filter((l) => !l.isWithinRange).length,
      });
    }
    return days;
  }, [temperatureLogs]);

  const pieData = useMemo(() => {
    const open = alerts.filter((a) => a.status === "open").length;
    const ack = alerts.filter((a) => a.status === "acknowledged").length;
    const resolved = alerts.filter((a) => a.status === "resolved").length;
    return [
      { name: "Open", value: open, color: "#ef4444" },
      { name: "Acknowledged", value: ack, color: "#f59e0b" },
      { name: "Resolved", value: resolved, color: "#10b981" },
    ];
  }, [alerts]);

  const recentAlerts = alerts.slice(0, 5);

  const liveStatus = useMemo(() => {
    return checkpoints.filter((c) => c.status === "active").map((cp) => {
      const latestLog = temperatureLogs.find((l) => l.checkpointId === cp.id);
      const facility = facilities.find((f) => f.id === cp.facilityId);
      return {
        checkpoint: cp,
        facility,
        latestLog,
        isOk: latestLog ? latestLog.isWithinRange : true,
      };
    }).slice(0, 6);
  }, [checkpoints, temperatureLogs, facilities]);

  if (loading) {
    return (
      <PageTransition>
        <div className="p-4 lg:p-6 space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
            {Array.from({ length: 4 }).map((_, i) => <CardSkeleton key={i} />)}
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2"><ChartSkeleton /></div>
            <ChartSkeleton />
          </div>
        </div>
      </PageTransition>
    );
  }

  const statCards = [
    { label: "Active Checkpoints", value: stats.activeCheckpoints, icon: ShieldCheck, color: "emerald", trend: "+3", up: true },
    { label: "Readings (24h)", value: stats.recentReadings, icon: Thermometer, color: "sky", trend: "+12", up: true },
    { label: "Violations (24h)", value: stats.violations24h, icon: AlertTriangle, color: "red", trend: stats.violations24h > 5 ? "+2" : "-1", up: stats.violations24h > 5 },
    { label: "Avg Compliance", value: stats.avgCompliance, icon: TrendingUp, color: "violet", suffix: "%", trend: "+2%", up: true },
  ];

  const colorMap: Record<string, { bg: string; iconBg: string; iconColor: string }> = {
    emerald: { bg: "bg-emerald-50 dark:bg-emerald-900/20", iconBg: "bg-emerald-100 dark:bg-emerald-800/60", iconColor: "text-emerald-600 dark:text-emerald-400" },
    sky: { bg: "bg-sky-50 dark:bg-sky-900/20", iconBg: "bg-sky-100 dark:bg-sky-800/60", iconColor: "text-sky-600 dark:text-sky-400" },
    red: { bg: "bg-red-50 dark:bg-red-900/20", iconBg: "bg-red-100 dark:bg-red-800/60", iconColor: "text-red-600 dark:text-red-400" },
    violet: { bg: "bg-violet-50 dark:bg-violet-900/20", iconBg: "bg-violet-100 dark:bg-violet-800/60", iconColor: "text-violet-600 dark:text-violet-400" },
  };

  return (
    <PageTransition>
      <div className="p-4 lg:p-6 space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          {statCards.map((card, i) => {
            const cm = colorMap[card.color];
            const Icon = card.icon;
            return (
              <motion.div
                key={card.label}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.08, duration: 0.4 }}
                className="group bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-5 hover:shadow-lg hover:shadow-gray-200/50 dark:hover:shadow-gray-900/50 transition-all duration-300 cursor-pointer hover:-translate-y-0.5"
              >
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">{card.label}</span>
                  <div className={`w-10 h-10 rounded-xl ${cm.iconBg} flex items-center justify-center transition-transform duration-300 group-hover:scale-110`}>
                    <Icon className={`w-5 h-5 ${cm.iconColor}`} />
                  </div>
                </div>
                <div className="text-3xl font-bold text-gray-900 dark:text-white">
                  <AnimatedNumber value={card.value} suffix={card.suffix || ""} />
                </div>
                <div className="flex items-center gap-1 mt-1">
                  {card.up ? (
                    <ArrowUpRight className="w-3.5 h-3.5 text-emerald-500" />
                  ) : (
                    <ArrowDownRight className="w-3.5 h-3.5 text-red-500" />
                  )}
                  <span className={`text-xs font-medium ${card.up && card.color !== "red" ? "text-emerald-600 dark:text-emerald-400" : "text-red-500"}`}>
                    {card.trend}
                  </span>
                  <span className="text-xs text-gray-400 ml-1">vs last week</span>
                </div>
              </motion.div>
            );
          })}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="lg:col-span-2 bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-6"
          >
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-sm font-bold text-gray-900 dark:text-white">Temperature Readings</h3>
                <p className="text-xs text-gray-400 mt-0.5">Last 14 days overview</p>
              </div>
              <div className="flex items-center gap-4 text-xs">
                <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-emerald-400" /> Compliant</span>
                <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-red-400" /> Violations</span>
              </div>
            </div>
            <ResponsiveContainer width="100%" height={260}>
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="gradCompliant" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="gradViolations" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke={darkMode ? "#374151" : "#f3f4f6"} />
                <XAxis dataKey="date" tick={{ fontSize: 11, fill: darkMode ? "#9ca3af" : "#6b7280" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: darkMode ? "#9ca3af" : "#6b7280" }} axisLine={false} tickLine={false} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: darkMode ? "#1f2937" : "#fff",
                    border: `1px solid ${darkMode ? "#374151" : "#e5e7eb"}`,
                    borderRadius: "12px",
                    fontSize: "12px",
                    boxShadow: "0 10px 25px rgba(0,0,0,0.1)",
                  }}
                />
                <Area type="monotone" dataKey="compliant" stroke="#10b981" strokeWidth={2.5} fill="url(#gradCompliant)" />
                <Area type="monotone" dataKey="violations" stroke="#ef4444" strokeWidth={2.5} fill="url(#gradViolations)" />
              </AreaChart>
            </ResponsiveContainer>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-6"
          >
            <h3 className="text-sm font-bold text-gray-900 dark:text-white mb-1">Alert Distribution</h3>
            <p className="text-xs text-gray-400 mb-4">By current status</p>
            <ResponsiveContainer width="100%" height={180}>
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={75}
                  paddingAngle={4}
                  dataKey="value"
                  strokeWidth={0}
                >
                  {pieData.map((entry, i) => (
                    <Cell key={i} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: darkMode ? "#1f2937" : "#fff",
                    border: `1px solid ${darkMode ? "#374151" : "#e5e7eb"}`,
                    borderRadius: "12px",
                    fontSize: "12px",
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
            <div className="flex justify-center gap-4 mt-2">
              {pieData.map((d) => (
                <span key={d.name} className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400">
                  <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: d.color }} />
                  {d.name} ({d.value})
                </span>
              ))}
            </div>
          </motion.div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700"
          >
            <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between">
              <h3 className="text-sm font-bold text-gray-900 dark:text-white">Live Monitor</h3>
              <span className="flex items-center gap-1.5 text-[10px] text-emerald-600 dark:text-emerald-400 font-medium">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
                </span>
                LIVE
              </span>
            </div>
            <div className="divide-y divide-gray-100 dark:divide-gray-700">
              {liveStatus.map(({ checkpoint, facility, latestLog, isOk }) => (
                <div key={checkpoint.id} className="px-6 py-3 flex items-center gap-3 hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors">
                  <div className={`w-2.5 h-2.5 rounded-full shrink-0 ${isOk ? "bg-emerald-500" : "bg-red-500 animate-pulse"}`} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-800 dark:text-gray-200 truncate">{checkpoint.name}</p>
                    <p className="text-[10px] text-gray-400">{facility?.name}</p>
                  </div>
                  {latestLog && (
                    <div className="text-right">
                      <span className={`text-sm font-mono font-bold ${isOk ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"}`}>
                        {latestLog.temperature}°{latestLog.unit}
                      </span>
                      <p className="text-[10px] text-gray-400 flex items-center gap-1 justify-end">
                        <Clock className="w-2.5 h-2.5" />
                        {format(new Date(latestLog.recordedAt), "h:mm a")}
                      </p>
                    </div>
                  )}
                  <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${isOk ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300" : "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300"}`}>
                    {isOk ? "IN RANGE" : "ALERT"}
                  </span>
                </div>
              ))}
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
            className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700"
          >
            <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between">
              <h3 className="text-sm font-bold text-gray-900 dark:text-white">Recent Alerts</h3>
              <button onClick={() => setPage("alerts")} className="text-xs text-emerald-600 dark:text-emerald-400 font-semibold hover:text-emerald-700 transition-colors">
                View all →
              </button>
            </div>
            <div className="divide-y divide-gray-100 dark:divide-gray-700">
              {recentAlerts.length === 0 && (
                <div className="px-6 py-8 text-center text-sm text-gray-400">No recent alerts</div>
              )}
              {recentAlerts.map((alert) => (
                <div key={alert.id} className="px-6 py-3 hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors">
                  <div className="flex items-start gap-3">
                    <SeverityBadge severity={alert.severity} size="sm" />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-gray-800 dark:text-gray-200 font-medium truncate">{alert.message}</p>
                      <p className="text-[10px] text-gray-400 mt-0.5">{format(new Date(alert.createdAt), "MMM d, h:mm a")}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7 }}
          className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700"
        >
          <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-700">
            <h3 className="text-sm font-bold text-gray-900 dark:text-white">Facility Overview</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-gray-100 dark:divide-gray-700">
            {facilities.map((fac) => {
              const report = reports.find((r) => r.facilityId === fac.id);
              const facCps = checkpoints.filter((c) => c.facilityId === fac.id);
              return (
                <div key={fac.id} className="p-5 hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors cursor-pointer" onClick={() => setPage("facilities")}>
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-100 to-emerald-200 dark:from-emerald-800/40 dark:to-emerald-700/40 flex items-center justify-center">
                      <Building2 className="w-4.5 h-4.5 text-emerald-600 dark:text-emerald-400" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-gray-900 dark:text-white">{fac.name}</p>
                      <p className="text-[10px] text-gray-400">{fac.type}</p>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-xs text-gray-500 dark:text-gray-400">{facCps.length} checkpoints</span>
                    </div>
                    {report && <ComplianceBadge score={report.complianceScore} />}
                  </div>
                </div>
              );
            })}
          </div>
        </motion.div>
      </div>
    </PageTransition>
  );
}
