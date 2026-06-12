import { storage } from "./storage";
import type {
  Facility,
  Checkpoint,
  TemperatureLog,
  Alert,
  AuditEntry,
  ComplianceReport,
  User,
} from "@/store/types";

/**
 * Dual-mode API service.
 *
 * - "remote" mode: talks to the REST backend in `server/` (JWT auth).
 *   Activated automatically when the backend health check succeeds.
 * - "local" mode: original IndexedDB persistence (demo / offline mode).
 *   Used when VITE_ENABLE_DEMO_MODE=true or the backend is unreachable.
 *
 * The store (`src/store`) branches on `api.isRemote()`.
 */

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3001/api";
const FORCE_DEMO = import.meta.env.VITE_ENABLE_DEMO_MODE === "true";
const TOKEN_KEY = "foodsafe_token";

export type ApiMode = "remote" | "local";

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

class ApiService {
  private mode: ApiMode = "local";
  private simulateLatency = true;
  private latencyMs = 150;

  /* ================================================================ */
  /* Mode detection                                                    */
  /* ================================================================ */

  async detectMode(): Promise<ApiMode> {
    if (FORCE_DEMO) {
      this.mode = "local";
      return this.mode;
    }
    try {
      const ctrl = new AbortController();
      const timer = setTimeout(() => ctrl.abort(), 2500);
      const res = await fetch(`${API_URL}/health`, { signal: ctrl.signal });
      clearTimeout(timer);
      this.mode = res.ok ? "remote" : "local";
    } catch {
      this.mode = "local";
    }
    if (this.mode === "local" && !FORCE_DEMO) {
      console.warn(
        `[FoodSafe] Backend not reachable at ${API_URL} — falling back to offline demo mode (IndexedDB).`
      );
    }
    return this.mode;
  }

  isRemote(): boolean {
    return this.mode === "remote";
  }

  /* ================================================================ */
  /* Token management                                                  */
  /* ================================================================ */

  getToken(): string | null {
    return localStorage.getItem(TOKEN_KEY);
  }

  setToken(token: string): void {
    localStorage.setItem(TOKEN_KEY, token);
  }

  clearToken(): void {
    localStorage.removeItem(TOKEN_KEY);
  }

  /* ================================================================ */
  /* HTTP helper                                                       */
  /* ================================================================ */

  private async request<T>(path: string, options: RequestInit = {}): Promise<T> {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      ...(options.headers as Record<string, string>),
    };
    const token = this.getToken();
    if (token) headers.Authorization = `Bearer ${token}`;

    const res = await fetch(`${API_URL}${path}`, { ...options, headers });

    if (!res.ok) {
      let message = `Request failed (${res.status})`;
      try {
        const body = await res.json();
        if (body?.error) message = body.error;
        if (body?.details?.length) {
          message += ": " + body.details.map((d: any) => d.message).join(", ");
        }
      } catch {
        /* non-JSON error body */
      }
      throw new ApiError(message, res.status);
    }

    return res.json() as Promise<T>;
  }

  /** GET that resolves to a fallback instead of throwing (e.g. 403 for
   *  roles without the permission, such as engineers viewing audit logs). */
  private async safeGet<T>(path: string, fallback: T): Promise<T> {
    try {
      return await this.request<T>(path);
    } catch {
      return fallback;
    }
  }

  /* ================================================================ */
  /* Remote endpoints                                                  */
  /* ================================================================ */

  async remoteLogin(email: string, password: string): Promise<{ token: string; user: User }> {
    const result = await this.request<{ token: string; user: User }>("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    });
    this.setToken(result.token);
    return result;
  }

  async remoteLogout(): Promise<void> {
    try {
      await this.request("/auth/logout", { method: "POST" });
    } catch {
      /* token may already be expired — still clear it */
    }
    this.clearToken();
  }

  async me(): Promise<User> {
    return this.request<User>("/auth/me");
  }

  async fetchUsers(): Promise<User[]> {
    return this.safeGet<User[]>("/users", []);
  }

  async createUser(
    data: Omit<User, "id" | "createdAt" | "lastLogin"> & { password: string }
  ): Promise<User> {
    return this.request<User>("/users", { method: "POST", body: JSON.stringify(data) });
  }

  async updateUserRemote(id: string, data: Partial<User> & { password?: string }): Promise<User> {
    return this.request<User>(`/users/${id}`, { method: "PATCH", body: JSON.stringify(data) });
  }

  async deleteUserRemote(id: string): Promise<void> {
    await this.request(`/users/${id}`, { method: "DELETE" });
  }

  async fetchFacilities(): Promise<Facility[]> {
    return this.safeGet<Facility[]>("/facilities", []);
  }

  async createFacility(data: Omit<Facility, "id" | "createdAt">): Promise<Facility> {
    return this.request<Facility>("/facilities", { method: "POST", body: JSON.stringify(data) });
  }

  async fetchCheckpoints(): Promise<Checkpoint[]> {
    return this.safeGet<Checkpoint[]>("/checkpoints", []);
  }

  async createCheckpoint(data: Omit<Checkpoint, "id" | "createdAt">): Promise<Checkpoint> {
    return this.request<Checkpoint>("/checkpoints", { method: "POST", body: JSON.stringify(data) });
  }

  async updateCheckpointRemote(id: string, data: Partial<Checkpoint>): Promise<Checkpoint> {
    return this.request<Checkpoint>(`/checkpoints/${id}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    });
  }

  async fetchTemperatureLogs(): Promise<TemperatureLog[]> {
    return this.safeGet<TemperatureLog[]>("/temperature-logs?limit=5000", []);
  }

  /** The server computes isWithinRange and auto-creates an alert on violation. */
  async createTemperatureLog(data: {
    checkpointId: string;
    temperature: number;
    unit?: string;
    notes?: string;
    correctiveAction?: string;
  }): Promise<{ log: TemperatureLog; alert: Alert | null }> {
    return this.request<{ log: TemperatureLog; alert: Alert | null }>("/temperature-logs", {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  async fetchAlerts(): Promise<Alert[]> {
    return this.safeGet<Alert[]>("/alerts", []);
  }

  async acknowledgeAlert(id: string): Promise<Alert> {
    return this.request<Alert>(`/alerts/${id}/acknowledge`, { method: "POST" });
  }

  async resolveAlert(id: string): Promise<Alert> {
    return this.request<Alert>(`/alerts/${id}/resolve`, { method: "POST" });
  }

  async fetchReports(): Promise<ComplianceReport[]> {
    return this.safeGet<ComplianceReport[]>("/reports", []);
  }

  async generateReportRemote(facilityId: string): Promise<ComplianceReport> {
    return this.request<ComplianceReport>("/reports/generate", {
      method: "POST",
      body: JSON.stringify({ facilityId }),
    });
  }

  async fetchAuditLog(): Promise<AuditEntry[]> {
    return this.safeGet<AuditEntry[]>("/audit?limit=1000", []);
  }

  /* ================================================================ */
  /* Local (demo / offline) persistence — original behavior            */
  /* ================================================================ */

  private async withLatency<T>(fn: () => Promise<T>): Promise<T> {
    if (this.simulateLatency) {
      await delay(this.latencyMs + Math.random() * 100);
    }
    return fn();
  }

  async getUsers(): Promise<User[]> {
    return this.withLatency(async () => (await storage.get<User[]>("users")) || []);
  }

  async saveUsers(users: User[]): Promise<void> {
    return this.withLatency(async () => storage.set("users", users));
  }

  async getFacilities(): Promise<Facility[]> {
    return this.withLatency(async () => (await storage.get<Facility[]>("facilities")) || []);
  }

  async saveFacilities(facilities: Facility[]): Promise<void> {
    return this.withLatency(async () => storage.set("facilities", facilities));
  }

  async getCheckpoints(): Promise<Checkpoint[]> {
    return this.withLatency(async () => (await storage.get<Checkpoint[]>("checkpoints")) || []);
  }

  async saveCheckpoints(checkpoints: Checkpoint[]): Promise<void> {
    return this.withLatency(async () => storage.set("checkpoints", checkpoints));
  }

  async getTemperatureLogs(): Promise<TemperatureLog[]> {
    return this.withLatency(
      async () => (await storage.get<TemperatureLog[]>("temperatureLogs")) || []
    );
  }

  async saveTemperatureLogs(logs: TemperatureLog[]): Promise<void> {
    return this.withLatency(async () => storage.set("temperatureLogs", logs));
  }

  async getAlerts(): Promise<Alert[]> {
    return this.withLatency(async () => (await storage.get<Alert[]>("alerts")) || []);
  }

  async saveAlerts(alerts: Alert[]): Promise<void> {
    return this.withLatency(async () => storage.set("alerts", alerts));
  }

  async getAuditLog(): Promise<AuditEntry[]> {
    return this.withLatency(async () => (await storage.get<AuditEntry[]>("auditLog")) || []);
  }

  async saveAuditLog(log: AuditEntry[]): Promise<void> {
    return this.withLatency(async () => storage.set("auditLog", log));
  }

  async getReports(): Promise<ComplianceReport[]> {
    return this.withLatency(async () => (await storage.get<ComplianceReport[]>("reports")) || []);
  }

  async saveReports(reports: ComplianceReport[]): Promise<void> {
    return this.withLatency(async () => storage.set("reports", reports));
  }

  async getCurrentUser(): Promise<User | null> {
    return this.withLatency(async () => storage.get<User>("currentUser"));
  }

  async saveCurrentUser(user: User | null): Promise<void> {
    return this.withLatency(async () => {
      if (user) {
        await storage.set("currentUser", user);
      } else {
        await storage.remove("currentUser");
      }
    });
  }

  async login(
    email: string,
    password: string
  ): Promise<{ success: boolean; user?: User; error?: string }> {
    return this.withLatency(async () => {
      const users = await this.getUsers();
      const passwords = (await storage.get<Record<string, string>>("passwords")) || {};

      const user = users.find((u) => u.email === email && u.isActive);
      if (!user) {
        return { success: false, error: "User not found or inactive" };
      }

      if (passwords[email] !== password) {
        return { success: false, error: "Invalid password" };
      }

      const updatedUser = { ...user, lastLogin: new Date().toISOString() };
      await this.saveCurrentUser(updatedUser);

      const updatedUsers = users.map((u) => (u.id === user.id ? updatedUser : u));
      await this.saveUsers(updatedUsers);

      return { success: true, user: updatedUser };
    });
  }

  async logout(): Promise<void> {
    return this.withLatency(async () => {
      await storage.remove("currentUser");
    });
  }

  async isInitialized(): Promise<boolean> {
    const initialized = await storage.get<boolean>("dataInitialized");
    return !!initialized;
  }

  async markInitialized(): Promise<void> {
    await storage.set("dataInitialized", true);
  }

  async getPasswords(): Promise<Record<string, string>> {
    return (await storage.get<Record<string, string>>("passwords")) || {};
  }

  async savePasswords(passwords: Record<string, string>): Promise<void> {
    await storage.set("passwords", passwords);
  }
}

export const api = new ApiService();
