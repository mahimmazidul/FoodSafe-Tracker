import { create } from "zustand";
import { v4 as uuid } from "uuid";
import { api, ApiError } from "@/services/api";
import type {
  Facility,
  Checkpoint,
  TemperatureLog,
  Alert,
  AuditEntry,
  ComplianceReport,
  Toast,
  AlertStatus,
  Severity,
  User,
  UserRole,
  AuditAction,
} from "./types";
import {
  seedFacilities,
  seedCheckpoints,
  seedTemperatureLogs,
  seedAlerts,
  seedAuditLog,
  seedReports,
  seedUsers,
  seedPasswords,
} from "./seed";

export type Page =
  | "dashboard"
  | "checkpoints"
  | "temperature"
  | "alerts"
  | "reports"
  | "analytics"
  | "audit"
  | "facilities"
  | "users"
  | "settings";

interface DashboardConfig {
  visibleCards: string[];
  layout: "grid" | "list";
}

interface AppState {
  darkMode: boolean;
  sidebarOpen: boolean;
  currentPage: Page;
  selectedFacilityId: string | null;
  searchOpen: boolean;
  isLoading: boolean;
  isInitialized: boolean;
  /** "remote" = REST backend (server/), "local" = offline IndexedDB demo */
  apiMode: "remote" | "local";

  dashboardConfig: DashboardConfig;

  currentUser: User | null;
  isAuthenticated: boolean;
  users: User[];

  facilities: Facility[];
  checkpoints: Checkpoint[];
  temperatureLogs: TemperatureLog[];
  alerts: Alert[];
  auditLog: AuditEntry[];
  reports: ComplianceReport[];
  toasts: Toast[];

  initialize: () => Promise<void>;
  toggleDarkMode: () => void;
  toggleSidebar: () => void;
  setPage: (page: Page) => void;
  setSelectedFacility: (id: string | null) => void;
  setSearchOpen: (open: boolean) => void;
  updateDashboardConfig: (config: Partial<DashboardConfig>) => void;

  login: (email: string, password: string) => Promise<boolean>;
  logout: () => Promise<void>;
  hasPermission: (permission: string) => boolean;

  addUser: (
    user: Omit<User, "id" | "createdAt" | "lastLogin"> & { password?: string }
  ) => Promise<void>;
  updateUser: (id: string, data: Partial<User> & { password?: string }) => Promise<void>;
  deleteUser: (id: string) => Promise<void>;

  addTemperatureLog: (log: Omit<TemperatureLog, "id">) => Promise<void>;
  addCheckpoint: (cp: Omit<Checkpoint, "id" | "createdAt">) => Promise<void>;
  updateCheckpoint: (id: string, data: Partial<Checkpoint>) => Promise<void>;
  addFacility: (fac: Omit<Facility, "id" | "createdAt">) => Promise<void>;
  updateAlertStatus: (id: string, status: AlertStatus) => Promise<void>;
  generateReport: (facilityId: string) => Promise<void>;

  addToast: (toast: Omit<Toast, "id">) => void;
  removeToast: (id: string) => void;
  addAuditEntry: (entry: Omit<AuditEntry, "id" | "timestamp" | "userId" | "user">) => Promise<void>;

  refreshData: () => Promise<void>;
}

const getInitialDarkMode = (): boolean => {
  if (typeof window !== "undefined") {
    const stored = localStorage.getItem("foodsafe-dark-mode");
    if (stored !== null) return stored === "true";
    return window.matchMedia("(prefers-color-scheme: dark)").matches;
  }
  return false;
};

const permissions: Record<UserRole, string[]> = {
  superadmin: [
    "view_dashboard", "log_temperature", "view_checkpoints", "create_checkpoints",
    "edit_checkpoints", "view_facilities", "create_facilities", "edit_facilities",
    "view_alerts", "acknowledge_alerts", "resolve_alerts", "view_reports",
    "generate_reports", "view_analytics", "view_audit", "manage_users", "system_settings",
  ],
  manager: [
    "view_dashboard", "log_temperature", "view_checkpoints", "create_checkpoints",
    "edit_checkpoints", "view_facilities", "create_facilities", "edit_facilities",
    "view_alerts", "acknowledge_alerts", "resolve_alerts", "view_reports",
    "generate_reports", "view_analytics", "view_audit",
  ],
  engineer: [
    "view_dashboard", "log_temperature", "view_checkpoints", "view_facilities",
    "view_alerts", "acknowledge_alerts",
  ],
};

const errMessage = (e: unknown): string =>
  e instanceof ApiError ? e.message : e instanceof Error ? e.message : "Something went wrong";

export const useStore = create<AppState>((set, get) => ({
  darkMode: getInitialDarkMode(),
  sidebarOpen: false,
  currentPage: "dashboard",
  selectedFacilityId: null,
  searchOpen: false,
  isLoading: true,
  isInitialized: false,
  apiMode: "local",

  dashboardConfig: {
    visibleCards: ["compliance", "alerts", "readings", "facilities", "live", "recent"],
    layout: "grid",
  },

  currentUser: null,
  isAuthenticated: false,
  users: [],

  facilities: [],
  checkpoints: [],
  temperatureLogs: [],
  alerts: [],
  auditLog: [],
  reports: [],
  toasts: [],

  initialize: async () => {
    set({ isLoading: true });

    const mode = await api.detectMode();
    set({ apiMode: mode });

    if (mode === "remote") {
      // Try to restore a session from a stored JWT.
      let currentUser: User | null = null;
      if (api.getToken()) {
        try {
          currentUser = await api.me();
        } catch {
          api.clearToken();
        }
      }

      if (currentUser) {
        set({ currentUser, isAuthenticated: true });
        await get().refreshData();
      }

      set({ isLoading: false, isInitialized: true });
      return;
    }

    // ---- Local (offline demo) mode: original IndexedDB flow ----
    const initialized = await api.isInitialized();

    if (!initialized) {
      await api.saveUsers(seedUsers);
      await api.saveFacilities(seedFacilities);
      await api.saveCheckpoints(seedCheckpoints);
      await api.saveTemperatureLogs(seedTemperatureLogs);
      await api.saveAlerts(seedAlerts);
      await api.saveAuditLog(seedAuditLog);
      await api.saveReports(seedReports);
      await api.savePasswords(seedPasswords);
      await api.markInitialized();
    }

    const [users, facilities, checkpoints, temperatureLogs, alerts, auditLog, reports, currentUser] = await Promise.all([
      api.getUsers(),
      api.getFacilities(),
      api.getCheckpoints(),
      api.getTemperatureLogs(),
      api.getAlerts(),
      api.getAuditLog(),
      api.getReports(),
      api.getCurrentUser(),
    ]);

    set({
      users,
      facilities,
      checkpoints,
      temperatureLogs,
      alerts,
      auditLog,
      reports,
      currentUser,
      isAuthenticated: !!currentUser,
      isLoading: false,
      isInitialized: true,
    });
  },

  refreshData: async () => {
    if (get().apiMode === "remote") {
      const [users, facilities, checkpoints, temperatureLogs, alerts, auditLog, reports] =
        await Promise.all([
          api.fetchUsers(),
          api.fetchFacilities(),
          api.fetchCheckpoints(),
          api.fetchTemperatureLogs(),
          api.fetchAlerts(),
          api.fetchAuditLog(),
          api.fetchReports(),
        ]);
      set({ users, facilities, checkpoints, temperatureLogs, alerts, auditLog, reports });
      return;
    }

    const [users, facilities, checkpoints, temperatureLogs, alerts, auditLog, reports] = await Promise.all([
      api.getUsers(),
      api.getFacilities(),
      api.getCheckpoints(),
      api.getTemperatureLogs(),
      api.getAlerts(),
      api.getAuditLog(),
      api.getReports(),
    ]);

    set({ users, facilities, checkpoints, temperatureLogs, alerts, auditLog, reports });
  },

  toggleDarkMode: () => {
    set((s) => {
      const next = !s.darkMode;
      localStorage.setItem("foodsafe-dark-mode", String(next));
      if (next) {
        document.documentElement.classList.add("dark");
      } else {
        document.documentElement.classList.remove("dark");
      }
      return { darkMode: next };
    });
  },

  toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),

  setPage: (page) => set({ currentPage: page, sidebarOpen: false }),

  setSelectedFacility: (id) => set({ selectedFacilityId: id }),

  setSearchOpen: (open) => set({ searchOpen: open }),

  updateDashboardConfig: (config) => {
    set((s) => ({
      dashboardConfig: { ...s.dashboardConfig, ...config },
    }));
  },

  login: async (email, password) => {
    if (get().apiMode === "remote") {
      try {
        const { user } = await api.remoteLogin(email, password);
        set({ currentUser: user, isAuthenticated: true });
        await get().refreshData();
        return true;
      } catch (e) {
        console.warn("[FoodSafe] Login failed:", errMessage(e));
        return false;
      }
    }

    const result = await api.login(email, password);

    if (result.success && result.user) {
      set({
        currentUser: result.user,
        isAuthenticated: true,
      });

      await get().addAuditEntry({
        action: "user_login",
        details: `User ${result.user.name} logged in`,
        entityType: "user",
        entityId: result.user.id,
      });

      return true;
    }
    return false;
  },

  logout: async () => {
    if (get().apiMode === "remote") {
      await api.remoteLogout();
      set({
        currentUser: null,
        isAuthenticated: false,
        currentPage: "dashboard",
        users: [],
        facilities: [],
        checkpoints: [],
        temperatureLogs: [],
        alerts: [],
        auditLog: [],
        reports: [],
      });
      return;
    }

    const user = get().currentUser;
    if (user) {
      await get().addAuditEntry({
        action: "user_logout",
        details: `User ${user.name} logged out`,
        entityType: "user",
        entityId: user.id,
      });
    }
    await api.logout();
    set({ currentUser: null, isAuthenticated: false, currentPage: "dashboard" });
  },

  hasPermission: (permission) => {
    const user = get().currentUser;
    if (!user) return false;
    return permissions[user.role]?.includes(permission) ?? false;
  },

  addUser: async (userData) => {
    if (get().apiMode === "remote") {
      const { password, ...rest } = userData;
      if (!password) {
        get().addToast({
          type: "error",
          title: "Password Required",
          message: "Set an initial password for the new user",
        });
        return;
      }
      try {
        const newUser = await api.createUser({ ...rest, password });
        set({ users: [...get().users, newUser] });
        get().addToast({ type: "success", title: "User Created", message: `${newUser.name} has been added` });
      } catch (e) {
        get().addToast({ type: "error", title: "Create Failed", message: errMessage(e) });
      }
      return;
    }

    const { password, ...rest } = userData;
    const id = uuid();
    const newUser: User = {
      ...rest,
      id,
      createdAt: new Date().toISOString(),
      lastLogin: null,
    };
    const users = [...get().users, newUser];
    await api.saveUsers(users);
    set({ users });

    if (password) {
      const passwords = await api.getPasswords();
      passwords[newUser.email] = password;
      await api.savePasswords(passwords);
    }

    await get().addAuditEntry({
      action: "user_created",
      details: `Created user ${newUser.name} with role ${newUser.role}`,
      entityType: "user",
      entityId: id,
    });

    get().addToast({ type: "success", title: "User Created", message: `${newUser.name} has been added` });
  },

  updateUser: async (id, data) => {
    if (get().apiMode === "remote") {
      try {
        const { password, ...rest } = data;
        const updated = await api.updateUserRemote(id, password ? { ...rest, password } : rest);
        set({ users: get().users.map((u) => (u.id === id ? updated : u)) });
      } catch (e) {
        get().addToast({ type: "error", title: "Update Failed", message: errMessage(e) });
      }
      return;
    }

    const { password, ...rest } = data;
    const users = get().users.map((u) => (u.id === id ? { ...u, ...rest } : u));
    await api.saveUsers(users);
    set({ users });

    if (password) {
      const user = users.find((u) => u.id === id);
      if (user) {
        const passwords = await api.getPasswords();
        passwords[user.email] = password;
        await api.savePasswords(passwords);
      }
    }

    await get().addAuditEntry({
      action: "user_updated",
      details: `Updated user ${id}`,
      entityType: "user",
      entityId: id,
    });
  },

  deleteUser: async (id) => {
    const user = get().users.find((u) => u.id === id);

    if (get().apiMode === "remote") {
      try {
        await api.deleteUserRemote(id);
        set({ users: get().users.filter((u) => u.id !== id) });
        get().addToast({ type: "info", title: "User Deleted", message: `${user?.name} has been removed` });
      } catch (e) {
        get().addToast({ type: "error", title: "Delete Failed", message: errMessage(e) });
      }
      return;
    }

    const users = get().users.filter((u) => u.id !== id);
    await api.saveUsers(users);
    set({ users });

    await get().addAuditEntry({
      action: "user_deleted",
      details: `Deleted user ${user?.name || id}`,
      entityType: "user",
      entityId: id,
    });

    get().addToast({ type: "info", title: "User Deleted", message: `${user?.name} has been removed` });
  },

  addTemperatureLog: async (log) => {
    const cp = get().checkpoints.find((c) => c.id === log.checkpointId);

    if (get().apiMode === "remote") {
      try {
        // Server computes isWithinRange and auto-creates the alert.
        const { log: savedLog, alert } = await api.createTemperatureLog({
          checkpointId: log.checkpointId,
          temperature: log.temperature,
          unit: log.unit,
          notes: log.notes,
          correctiveAction: log.correctiveAction,
        });

        set({ temperatureLogs: [savedLog, ...get().temperatureLogs] });

        if (alert) {
          set({ alerts: [alert, ...get().alerts] });
          get().addToast({
            type: alert.severity === "critical" ? "error" : "warning",
            title: `${alert.severity.toUpperCase()} Violation`,
            message: alert.message,
            duration: alert.severity === "critical" ? 10000 : 5000,
          });
        } else {
          get().addToast({
            type: "success",
            title: "Temperature Logged",
            message: `${savedLog.temperature}°${savedLog.unit} recorded successfully`,
          });
        }
      } catch (e) {
        get().addToast({ type: "error", title: "Logging Failed", message: errMessage(e) });
      }
      return;
    }

    const id = uuid();
    const fullLog = { ...log, id };

    const temperatureLogs = [fullLog, ...get().temperatureLogs];
    await api.saveTemperatureLogs(temperatureLogs);
    set({ temperatureLogs });

    await get().addAuditEntry({
      action: "temperature_logged",
      details: `${log.temperature}°${log.unit} at ${cp?.name || "Unknown"}`,
      entityType: "temperature_log",
      entityId: id,
    });

    if (!log.isWithinRange && cp) {
      const dev = log.temperature < cp.tempMin
        ? cp.tempMin - log.temperature
        : log.temperature - cp.tempMax;
      const severity: Severity = dev > 15 ? "critical" : dev > 8 ? "high" : dev > 4 ? "medium" : "low";
      const alertId = uuid();

      const alert: Alert = {
        id: alertId,
        facilityId: log.facilityId,
        checkpointId: log.checkpointId,
        temperatureLogId: id,
        severity,
        status: "open",
        message: `${cp.name}: ${log.temperature}°${log.unit} outside range ${cp.tempMin}–${cp.tempMax}°${cp.unit}`,
        temperature: log.temperature,
        tempMin: cp.tempMin,
        tempMax: cp.tempMax,
        createdAt: new Date().toISOString(),
        acknowledgedAt: null,
        acknowledgedBy: null,
        resolvedAt: null,
      };

      const alerts = [alert, ...get().alerts];
      await api.saveAlerts(alerts);
      set({ alerts });

      await get().addAuditEntry({
        action: "alert_created",
        details: alert.message,
        entityType: "alert",
        entityId: alertId,
      });

      get().addToast({
        type: severity === "critical" ? "error" : "warning",
        title: `${severity.toUpperCase()} Violation`,
        message: alert.message,
        duration: severity === "critical" ? 10000 : 5000,
      });
    } else {
      get().addToast({
        type: "success",
        title: "Temperature Logged",
        message: `${log.temperature}°${log.unit} recorded successfully`,
      });
    }
  },

  addCheckpoint: async (cp) => {
    if (get().apiMode === "remote") {
      try {
        const created = await api.createCheckpoint(cp);
        set({ checkpoints: [...get().checkpoints, created] });
        get().addToast({ type: "success", title: "Checkpoint Created", message: `"${cp.name}" has been added` });
      } catch (e) {
        get().addToast({ type: "error", title: "Create Failed", message: errMessage(e) });
      }
      return;
    }

    const id = uuid();
    const checkpoints = [...get().checkpoints, { ...cp, id, createdAt: new Date().toISOString() }];
    await api.saveCheckpoints(checkpoints);
    set({ checkpoints });

    await get().addAuditEntry({
      action: "checkpoint_created",
      details: `Created checkpoint "${cp.name}"`,
      entityType: "checkpoint",
      entityId: id,
    });

    get().addToast({ type: "success", title: "Checkpoint Created", message: `"${cp.name}" has been added` });
  },

  updateCheckpoint: async (id, data) => {
    if (get().apiMode === "remote") {
      try {
        const updated = await api.updateCheckpointRemote(id, data);
        set({ checkpoints: get().checkpoints.map((c) => (c.id === id ? updated : c)) });
      } catch (e) {
        get().addToast({ type: "error", title: "Update Failed", message: errMessage(e) });
      }
      return;
    }

    const checkpoints = get().checkpoints.map((c) => (c.id === id ? { ...c, ...data } : c));
    await api.saveCheckpoints(checkpoints);
    set({ checkpoints });

    await get().addAuditEntry({
      action: "checkpoint_modified",
      details: `Updated checkpoint ${id}`,
      entityType: "checkpoint",
      entityId: id,
    });
  },

  addFacility: async (fac) => {
    if (get().apiMode === "remote") {
      try {
        const created = await api.createFacility(fac);
        set({ facilities: [...get().facilities, created] });
        get().addToast({ type: "success", title: "Facility Added", message: `"${fac.name}" is ready` });
      } catch (e) {
        get().addToast({ type: "error", title: "Create Failed", message: errMessage(e) });
      }
      return;
    }

    const id = uuid();
    const facilities = [...get().facilities, { ...fac, id, createdAt: new Date().toISOString() }];
    await api.saveFacilities(facilities);
    set({ facilities });

    await get().addAuditEntry({
      action: "facility_created",
      details: `Created facility "${fac.name}"`,
      entityType: "facility",
      entityId: id,
    });

    get().addToast({ type: "success", title: "Facility Added", message: `"${fac.name}" is ready` });
  },

  updateAlertStatus: async (id, status) => {
    if (get().apiMode === "remote") {
      try {
        const updated =
          status === "acknowledged" ? await api.acknowledgeAlert(id) : await api.resolveAlert(id);
        set({ alerts: get().alerts.map((a) => (a.id === id ? updated : a)) });
      } catch (e) {
        get().addToast({ type: "error", title: "Action Failed", message: errMessage(e) });
      }
      return;
    }

    const user = get().currentUser;
    const userName = user?.name || "System";

    const alerts = get().alerts.map((a) =>
      a.id === id
        ? {
            ...a,
            status,
            acknowledgedAt: status === "acknowledged" ? new Date().toISOString() : a.acknowledgedAt,
            acknowledgedBy: status === "acknowledged" ? userName : a.acknowledgedBy,
            resolvedAt: status === "resolved" ? new Date().toISOString() : a.resolvedAt,
          }
        : a
    );

    await api.saveAlerts(alerts);
    set({ alerts });

    const action: AuditAction = status === "acknowledged" ? "alert_acknowledged" : "alert_resolved";
    await get().addAuditEntry({
      action,
      details: `Alert ${id.slice(0, 8)} marked as ${status}`,
      entityType: "alert",
      entityId: id,
    });
  },

  generateReport: async (facilityId) => {
    if (get().apiMode === "remote") {
      try {
        const report = await api.generateReportRemote(facilityId);
        set({ reports: [report, ...get().reports] });
        get().addToast({
          type: "info",
          title: "Report Generated",
          message: `Compliance score: ${report.complianceScore}%`,
        });
      } catch (e) {
        get().addToast({ type: "error", title: "Report Failed", message: errMessage(e) });
      }
      return;
    }

    const s = get();
    const user = s.currentUser;
    const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000);
    const facLogs = s.temperatureLogs.filter(
      (l) => l.facilityId === facilityId && new Date(l.recordedAt) >= thirtyDaysAgo
    );
    const facCps = s.checkpoints.filter((c) => c.facilityId === facilityId);
    const violations = facLogs.filter((l) => !l.isWithinRange).length;
    const compliant = facCps.filter((cp) => {
      const cpLogs = facLogs.filter((l) => l.checkpointId === cp.id);
      const cpV = cpLogs.filter((l) => !l.isWithinRange).length;
      return cpV / Math.max(cpLogs.length, 1) < 0.1;
    }).length;
    const score = facLogs.length > 0 ? Math.round(((facLogs.length - violations) / facLogs.length) * 100) : 100;

    const report: ComplianceReport = {
      id: uuid(),
      facilityId,
      periodStart: thirtyDaysAgo.toISOString(),
      periodEnd: new Date().toISOString(),
      totalCheckpoints: facCps.length,
      compliantCheckpoints: compliant,
      totalReadings: facLogs.length,
      violations,
      complianceScore: score,
      generatedAt: new Date().toISOString(),
      generatedBy: user?.name || "System",
    };

    const reports = [report, ...s.reports];
    await api.saveReports(reports);
    set({ reports });

    await get().addAuditEntry({
      action: "report_generated",
      details: `Compliance report for facility ${facilityId.slice(0, 8)}`,
      entityType: "report",
      entityId: report.id,
    });

    get().addToast({ type: "info", title: "Report Generated", message: `Compliance score: ${score}%` });
  },

  addToast: (toast) => {
    const id = uuid();
    set((s) => ({ toasts: [...s.toasts, { ...toast, id }] }));
    setTimeout(() => {
      set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) }));
    }, toast.duration || 4000);
  },

  removeToast: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),

  addAuditEntry: async (entry) => {
    // In remote mode the backend records audit entries automatically for
    // every mutating action — nothing to do client-side.
    if (get().apiMode === "remote") return;

    const user = get().currentUser;
    const newEntry: AuditEntry = {
      ...entry,
      id: uuid(),
      timestamp: new Date().toISOString(),
      userId: user?.id || "system",
      user: user?.name || "System",
    };

    const auditLog = [newEntry, ...get().auditLog];
    await api.saveAuditLog(auditLog);
    set({ auditLog });
  },
}));
