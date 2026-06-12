import { cn } from "@/utils/cn";
import { AlertTriangle, AlertOctagon, Info, CheckCircle, CheckCircle2, ShieldCheck, ShieldAlert, ShieldX, Trophy } from "lucide-react";
import type { Severity, AlertStatus } from "@/store/types";

const severityConfig: Record<Severity, { icon: typeof AlertTriangle; bg: string; text: string; pulse: boolean }> = {
  critical: { icon: AlertOctagon, bg: "bg-red-100 dark:bg-red-900/40", text: "text-red-700 dark:text-red-300", pulse: true },
  high: { icon: AlertTriangle, bg: "bg-amber-100 dark:bg-amber-900/40", text: "text-amber-700 dark:text-amber-300", pulse: false },
  medium: { icon: Info, bg: "bg-sky-100 dark:bg-sky-900/40", text: "text-sky-700 dark:text-sky-300", pulse: false },
  low: { icon: CheckCircle, bg: "bg-emerald-100 dark:bg-emerald-900/40", text: "text-emerald-700 dark:text-emerald-300", pulse: false },
};

export function SeverityBadge({ severity, size = "sm" }: { severity: Severity; size?: "sm" | "md" }) {
  const config = severityConfig[severity];
  const Icon = config.icon;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full font-semibold uppercase tracking-wide",
        config.bg,
        config.text,
        size === "sm" ? "px-2 py-0.5 text-[10px]" : "px-3 py-1 text-xs"
      )}
    >
      {config.pulse && (
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
          <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500" />
        </span>
      )}
      <Icon className={size === "sm" ? "w-3 h-3" : "w-3.5 h-3.5"} />
      {severity}
    </span>
  );
}

const statusConfig: Record<AlertStatus, { icon: typeof ShieldCheck; bg: string; text: string }> = {
  open: { icon: ShieldX, bg: "bg-red-100 dark:bg-red-900/40", text: "text-red-700 dark:text-red-300" },
  acknowledged: { icon: ShieldAlert, bg: "bg-amber-100 dark:bg-amber-900/40", text: "text-amber-700 dark:text-amber-300" },
  resolved: { icon: ShieldCheck, bg: "bg-emerald-100 dark:bg-emerald-900/40", text: "text-emerald-700 dark:text-emerald-300" },
};

export function StatusBadge({ status }: { status: AlertStatus }) {
  const config = statusConfig[status];
  const Icon = config.icon;
  return (
    <span className={cn("inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide", config.bg, config.text)}>
      <Icon className="w-3 h-3" />
      {status}
    </span>
  );
}

export function ComplianceBadge({ score }: { score: number }) {
  const color =
    score >= 95 ? "text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/30" :
    score >= 85 ? "text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/30" :
    "text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/30";
  const label = score >= 95 ? "Excellent" : score >= 85 ? "Good" : "Needs Attention";
  const ScoreIcon = score >= 95 ? Trophy : score >= 85 ? CheckCircle2 : AlertTriangle;
  return (
    <span className={cn("inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold", color)}>
      <ScoreIcon className="w-3.5 h-3.5" /> {label}
    </span>
  );
}

export function HazardBadge({ type }: { type: string }) {
  const config: Record<string, string> = {
    biological: "bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300",
    chemical: "bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300",
    physical: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300",
    allergen: "bg-pink-100 text-pink-700 dark:bg-pink-900/40 dark:text-pink-300",
  };
  return (
    <span className={cn("inline-flex items-center rounded-full px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide", config[type] || "bg-gray-100 text-gray-700")}>
      {type}
    </span>
  );
}

export function ActiveBadge({ active }: { active: boolean }) {
  return (
    <span className={cn(
      "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
      active
        ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300"
        : "bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400"
    )}>
      <span className={cn("w-1.5 h-1.5 rounded-full", active ? "bg-emerald-500" : "bg-gray-400")} />
      {active ? "Active" : "Inactive"}
    </span>
  );
}

export function TempBadge({ temp, min, max, unit }: { temp: number; min: number; max: number; unit: string }) {
  const inRange = temp >= min && temp <= max;
  return (
    <span className={cn(
      "inline-flex items-center gap-1 rounded-lg px-2 py-0.5 text-xs font-mono font-semibold",
      inRange
        ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300"
        : "bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-300"
    )}>
      {inRange ? <CheckCircle className="w-3 h-3" /> : <AlertTriangle className="w-3 h-3" />}
      {temp}°{unit}
    </span>
  );
}
