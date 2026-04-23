import { useEffect, useMemo, useState } from "react";
import { apiRequest } from "@/lib/queryClient";

type View = "dashboard" | "users" | "userDetail" | "audit";
type StatusFilter = "all" | "active" | "suspended";

type Plan = {
  id: string;
  name: string;
  max_ai_calls: number;
  max_projects?: number;
  price_usd: number;
  features?: string[];
};

type UserRow = {
  id: string;
  email: string;
  username: string;
  created_at: string;
  is_active: boolean;
  is_suspended: boolean;
  credits_purchased?: number;
  total_spent_usd?: number;
  user_subscriptions?: Array<{
    status: string;
    started_at: string;
    expires_at: string | null;
    ai_calls_used: number;
    subscription_plans?: {
      id?: string;
      name: string;
      max_ai_calls: number;
      price_usd: number;
    };
  }>;
};

type HistoryRow = {
  id: string;
  action: string;
  changed_by: string;
  reason: string | null;
  created_at: string;
  subscription_plans?: { name: string } | null;
  previous_plan?: { name: string } | null;
};

type AuditRow = {
  id: string;
  admin_email: string;
  action: string;
  target_user_id: string | null;
  details: Record<string, unknown>;
  created_at: string;
};

type Stats = {
  totalUsers: number;
  activeUsers: number;
  suspendedUsers: number;
  activeSubscriptions: number;
  totalAiCallsUsed: number;
  recentActions: number;
  totalCreditsPurchased: number;
  totalCreditRevenue: number;
};

type PurchaseRow = {
  id: string;
  credits: number;
  amount_usd: number;
  payment_method: string | null;
  payment_ref: string | null;
  status: string;
  purchased_at: string;
};

const ADMIN_TOKEN_KEY = "admin_token";

function formatDate(value?: string | null): string {
  if (!value) {
    return "-";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "-";
  }

  return date.toLocaleString();
}

async function adminRequest<T>(
  token: string,
  method: "GET" | "POST",
  url: string,
  body?: unknown,
): Promise<T> {
  const response = await fetch(url, {
    method,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  const text = await response.text();
  let payload: Record<string, unknown> = {};

  if (text) {
    try {
      payload = JSON.parse(text) as Record<string, unknown>;
    } catch {
      payload = { message: text };
    }
  }

  if (!response.ok) {
    const errorText =
      (typeof payload.error === "string" && payload.error)
      || (typeof payload.message === "string" && payload.message)
      || `${response.status} request failed`;
    throw new Error(errorText);
  }

  return payload as T;
}

export default function AdminPage() {
  const [token, setToken] = useState<string | null>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loginError, setLoginError] = useState<string | null>(null);
  const [loginLoading, setLoginLoading] = useState(false);

  const [view, setView] = useState<View>("dashboard");

  const [stats, setStats] = useState<Stats | null>(null);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [users, setUsers] = useState<UserRow[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditRow[]>([]);

  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [selectedUser, setSelectedUser] = useState<UserRow | null>(null);
  const [selectedUserHistory, setSelectedUserHistory] = useState<HistoryRow[]>([]);
  const [selectedUserPurchases, setSelectedUserPurchases] = useState<PurchaseRow[]>([]);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [pageError, setPageError] = useState<string | null>(null);
  const [isBusy, setIsBusy] = useState(false);

  useEffect(() => {
    const existing = window.localStorage.getItem(ADMIN_TOKEN_KEY);
    if (existing) {
      setToken(existing);
    }
  }, []);

  useEffect(() => {
    if (!token) {
      return;
    }

    void loadCoreData(token);
  }, [token]);

  useEffect(() => {
    if (!token || !selectedUserId) {
      return;
    }

    void loadUserDetail(token, selectedUserId);
  }, [token, selectedUserId]);

  async function loadCoreData(authToken: string) {
    setIsBusy(true);
    setPageError(null);

    try {
      const [statsRes, usersRes, plansRes, logsRes] = await Promise.all([
        adminRequest<{ totalUsers: number; activeUsers: number; suspendedUsers: number; activeSubscriptions: number; totalAiCallsUsed: number; recentActions: number; totalCreditsPurchased: number; totalCreditRevenue: number }>(authToken, "GET", "/api/admin/stats"),
        adminRequest<{ users: UserRow[] }>(authToken, "GET", "/api/admin/users"),
        adminRequest<{ plans: Plan[] }>(authToken, "GET", "/api/admin/plans"),
        adminRequest<{ logs: AuditRow[] }>(authToken, "GET", "/api/admin/audit-log"),
      ]);

      setStats(statsRes);
      setUsers(usersRes.users || []);
      setPlans(plansRes.plans || []);
      setAuditLogs(logsRes.logs || []);
    } catch (error) {
      setPageError(error instanceof Error ? error.message : "Failed to load admin data");
    } finally {
      setIsBusy(false);
    }
  }

  async function loadUserDetail(authToken: string, userId: string) {
    setIsBusy(true);
    setPageError(null);

    try {
      const result = await adminRequest<{ user: UserRow; history: HistoryRow[]; purchases: PurchaseRow[] }>(authToken, "GET", `/api/admin/users/${userId}`);
      setSelectedUser(result.user);
      setSelectedUserHistory(result.history || []);
      setSelectedUserPurchases(result.purchases || []);
    } catch (error) {
      setPageError(error instanceof Error ? error.message : "Failed to load user detail");
    } finally {
      setIsBusy(false);
    }
  }

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoginError(null);
    setLoginLoading(true);

    try {
      const response = await apiRequest("POST", "/api/admin/login", { email, password });
      const payload = (await response.json()) as { token?: string };
      if (!payload.token) {
        throw new Error("Missing admin token");
      }

      window.localStorage.setItem(ADMIN_TOKEN_KEY, payload.token);
      setToken(payload.token);
      setView("dashboard");
    } catch (error) {
      setLoginError(error instanceof Error ? error.message : "Admin login failed");
    } finally {
      setLoginLoading(false);
    }
  }

  async function handleLogout() {
    if (!token) {
      return;
    }

    try {
      await adminRequest<{ success: boolean }>(token, "POST", "/api/admin/logout");
    } catch {
      // Ignore logout server errors while clearing local session.
    }

    window.localStorage.removeItem(ADMIN_TOKEN_KEY);
    setToken(null);
    setSelectedUserId(null);
    setSelectedUser(null);
    setSelectedUserHistory([]);
    setSelectedUserPurchases([]);
    setEmail("");
    setPassword("");
  }

  async function suspendUser(userId: string) {
    if (!token) {
      return;
    }

    const reason = window.prompt("Reason for suspension:", "Policy violation") || "";
    if (!reason.trim()) {
      return;
    }

    await adminRequest<{ success: boolean }>(token, "POST", `/api/admin/users/${userId}/suspend`, { reason });
    await loadCoreData(token);
    if (selectedUserId === userId) {
      await loadUserDetail(token, userId);
    }
  }

  async function reactivateUser(userId: string) {
    if (!token) {
      return;
    }

    await adminRequest<{ success: boolean }>(token, "POST", `/api/admin/users/${userId}/reactivate`);
    await loadCoreData(token);
    if (selectedUserId === userId) {
      await loadUserDetail(token, userId);
    }
  }

  async function changePlan(userId: string) {
    if (!token) {
      return;
    }

    const planOptions = plans.map((p) => `${p.id} (${p.name})`).join("\n");
    const planId = window.prompt(`Enter plan id:\n${planOptions}`) || "";
    if (!planId.trim()) {
      return;
    }

    const reason = window.prompt("Reason for plan change:", "Admin update") || null;

    await adminRequest<{ success: boolean }>(token, "POST", `/api/admin/users/${userId}/subscription`, {
      planId,
      reason,
    });

    await loadCoreData(token);
    if (selectedUserId === userId) {
      await loadUserDetail(token, userId);
    }
  }

  const filteredUsers = useMemo(() => {
    const normalized = search.trim().toLowerCase();

    return users.filter((user) => {
      const matchesSearch =
        !normalized ||
        user.username.toLowerCase().includes(normalized) ||
        user.email.toLowerCase().includes(normalized);

      const isSuspended = user.is_suspended;
      const matchesFilter =
        statusFilter === "all" ||
        (statusFilter === "active" && !isSuspended) ||
        (statusFilter === "suspended" && isSuspended);

      return matchesSearch && matchesFilter;
    });
  }, [users, search, statusFilter]);

  if (!token) {
    return (
      <div className="min-h-screen bg-[hsl(240,10%,4%)] text-foreground flex items-center justify-center p-6">
        <form onSubmit={handleLogin} className="w-full max-w-md rounded-xl border border-[hsl(240,5%,16%)] bg-[hsl(240,10%,7%)] p-6 space-y-4">
          <h1 className="text-xl font-semibold">Admin Login</h1>
          <input
            className="w-full rounded-md border border-[hsl(240,5%,16%)] bg-[hsl(240,10%,9%)] px-3 py-2"
            placeholder="Admin email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <input
            type="password"
            className="w-full rounded-md border border-[hsl(240,5%,16%)] bg-[hsl(240,10%,9%)] px-3 py-2"
            placeholder="Admin password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          {loginError && <p className="text-sm text-red-400">{loginError}</p>}
          <button
            type="submit"
            disabled={loginLoading}
            className="w-full rounded-md bg-primary/80 hover:bg-primary px-3 py-2 text-white"
          >
            {loginLoading ? "Signing in..." : "Sign in"}
          </button>
        </form>
      </div>
    );
  }

  const selectedSub = selectedUser?.user_subscriptions?.[0];
  const selectedPlan = selectedSub?.subscription_plans;

  return (
    <div className="min-h-screen bg-[hsl(240,10%,4%)] text-foreground grid grid-cols-[240px_1fr]">
      <aside className="border-r border-[hsl(240,5%,16%)] p-4 flex flex-col gap-2">
        <h2 className="text-lg font-semibold mb-3">Admin Panel</h2>

        <button className={`text-left rounded px-3 py-2 ${view === "dashboard" ? "bg-primary/20" : "hover:bg-white/5"}`} onClick={() => setView("dashboard")}>Dashboard</button>
        <button className={`text-left rounded px-3 py-2 ${view === "users" ? "bg-primary/20" : "hover:bg-white/5"}`} onClick={() => setView("users")}>Users</button>
        <button className={`text-left rounded px-3 py-2 ${view === "audit" ? "bg-primary/20" : "hover:bg-white/5"}`} onClick={() => setView("audit")}>Audit Log</button>

        <div className="mt-auto">
          <button onClick={handleLogout} className="w-full rounded px-3 py-2 border border-[hsl(240,5%,16%)] hover:bg-white/5">Logout</button>
        </div>
      </aside>

      <main className="p-6 overflow-auto">
        {pageError && <p className="mb-4 text-sm text-red-400">{pageError}</p>}
        {isBusy && <p className="mb-4 text-sm text-muted-foreground">Loading...</p>}

        {view === "dashboard" && stats && (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {[
              ["Total users", stats.totalUsers],
              ["Active users", stats.activeUsers],
              ["Suspended users", stats.suspendedUsers],
              ["Active subscriptions", stats.activeSubscriptions],
              ["Total AI calls used", stats.totalAiCallsUsed],
              ["Recent actions (30 days)", stats.recentActions],
              ["Credits purchased", stats.totalCreditsPurchased],
              ["Credit revenue (USD)", stats.totalCreditRevenue.toFixed(2)],
            ].map(([label, value]) => (
              <div key={String(label)} className="rounded-lg border border-[hsl(240,5%,16%)] bg-[hsl(240,10%,7%)] p-4">
                <p className="text-sm text-muted-foreground">{String(label)}</p>
                <p className="text-2xl font-semibold mt-1">{Number(value)}</p>
              </div>
            ))}
          </div>
        )}

        {view === "users" && (
          <div className="space-y-4">
            <div className="flex flex-col md:flex-row gap-3 md:items-center md:justify-between">
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by username or email"
                className="w-full md:w-96 rounded-md border border-[hsl(240,5%,16%)] bg-[hsl(240,10%,9%)] px-3 py-2"
              />

              <div className="flex gap-2">
                {(["all", "active", "suspended"] as const).map((filter) => (
                  <button
                    key={filter}
                    onClick={() => setStatusFilter(filter)}
                    className={`rounded px-3 py-2 text-sm ${statusFilter === filter ? "bg-primary/20" : "border border-[hsl(240,5%,16%)] hover:bg-white/5"}`}
                  >
                    {filter[0].toUpperCase() + filter.slice(1)}
                  </button>
                ))}
              </div>
            </div>

            <div className="overflow-auto rounded-lg border border-[hsl(240,5%,16%)]">
              <table className="w-full text-sm">
                <thead className="bg-[hsl(240,10%,8%)] text-left">
                  <tr>
                    <th className="px-3 py-2">Username</th>
                    <th className="px-3 py-2">Email</th>
                    <th className="px-3 py-2">Plan</th>
                    <th className="px-3 py-2">Status</th>
                    <th className="px-3 py-2">AI Calls Used</th>
                    <th className="px-3 py-2">Credits Bought</th>
                    <th className="px-3 py-2">Spent (USD)</th>
                    <th className="px-3 py-2">Joined</th>
                    <th className="px-3 py-2">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredUsers.map((user) => {
                    const sub = user.user_subscriptions?.[0];
                    const plan = sub?.subscription_plans?.name || "free";
                    const status = user.is_suspended ? "Suspended" : "Active";
                    const aiCallsUsed = sub?.ai_calls_used ?? 0;
                    const creditsBought = user.credits_purchased ?? 0;
                    const totalSpent = Number(user.total_spent_usd ?? 0).toFixed(2);

                    return (
                      <tr key={user.id} className="border-t border-[hsl(240,5%,16%)]">
                        <td className="px-3 py-2">{user.username}</td>
                        <td className="px-3 py-2">{user.email}</td>
                        <td className="px-3 py-2">{plan}</td>
                        <td className="px-3 py-2">{status}</td>
                        <td className="px-3 py-2">{aiCallsUsed}</td>
                        <td className="px-3 py-2">{creditsBought}</td>
                        <td className="px-3 py-2">{totalSpent}</td>
                        <td className="px-3 py-2">{formatDate(user.created_at)}</td>
                        <td className="px-3 py-2">
                          <div className="flex gap-2">
                            <button
                              className="rounded border border-[hsl(240,5%,16%)] px-2 py-1 hover:bg-white/5"
                              onClick={() => {
                                setSelectedUserId(user.id);
                                setView("userDetail");
                              }}
                            >
                              View
                            </button>

                            {!user.is_suspended ? (
                              <button className="rounded border border-red-400/30 px-2 py-1 text-red-300 hover:bg-red-400/10" onClick={() => void suspendUser(user.id)}>Suspend</button>
                            ) : (
                              <button className="rounded border border-emerald-400/30 px-2 py-1 text-emerald-300 hover:bg-emerald-400/10" onClick={() => void reactivateUser(user.id)}>Reactivate</button>
                            )}

                            <button
                              className="rounded border border-[hsl(240,5%,16%)] px-2 py-1 hover:bg-white/5"
                              onClick={() => void changePlan(user.id)}
                            >
                              Change Plan
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {view === "userDetail" && selectedUser && (
          <div className="space-y-4">
            <button onClick={() => setView("users")} className="rounded border border-[hsl(240,5%,16%)] px-3 py-2 hover:bg-white/5">Back to users</button>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="rounded-lg border border-[hsl(240,5%,16%)] bg-[hsl(240,10%,7%)] p-4">
                <h3 className="font-semibold mb-2">User Info</h3>
                <p><span className="text-muted-foreground">Username:</span> {selectedUser.username}</p>
                <p><span className="text-muted-foreground">Email:</span> {selectedUser.email}</p>
                <p><span className="text-muted-foreground">Status:</span> {selectedUser.is_suspended ? "Suspended" : "Active"}</p>
                <p><span className="text-muted-foreground">Joined:</span> {formatDate(selectedUser.created_at)}</p>
              </div>

              <div className="rounded-lg border border-[hsl(240,5%,16%)] bg-[hsl(240,10%,7%)] p-4">
                <h3 className="font-semibold mb-2">Current Subscription</h3>
                <p><span className="text-muted-foreground">Plan:</span> {selectedPlan?.name || "free"}</p>
                <p><span className="text-muted-foreground">Started:</span> {formatDate(selectedSub?.started_at)}</p>
                <p><span className="text-muted-foreground">Expires:</span> {formatDate(selectedSub?.expires_at)}</p>
                <p>
                  <span className="text-muted-foreground">AI calls used:</span>{" "}
                  {selectedSub?.ai_calls_used ?? 0}/{selectedPlan?.max_ai_calls ?? 50}
                </p>
              </div>
            </div>

            <div className="flex gap-2">
              {!selectedUser.is_suspended ? (
                <button className="rounded border border-red-400/30 px-3 py-2 text-red-300 hover:bg-red-400/10" onClick={() => void suspendUser(selectedUser.id)}>Suspend</button>
              ) : (
                <button className="rounded border border-emerald-400/30 px-3 py-2 text-emerald-300 hover:bg-emerald-400/10" onClick={() => void reactivateUser(selectedUser.id)}>Reactivate</button>
              )}
              <button className="rounded border border-[hsl(240,5%,16%)] px-3 py-2 hover:bg-white/5" onClick={() => void changePlan(selectedUser.id)}>Change Plan</button>
            </div>

            <div className="rounded-lg border border-[hsl(240,5%,16%)] overflow-auto max-h-[420px]">
              <table className="w-full text-sm">
                <thead className="bg-[hsl(240,10%,8%)] text-left">
                  <tr>
                    <th className="px-3 py-2">Date</th>
                    <th className="px-3 py-2">Action</th>
                    <th className="px-3 py-2">Plan</th>
                    <th className="px-3 py-2">Previous Plan</th>
                    <th className="px-3 py-2">Changed By</th>
                    <th className="px-3 py-2">Reason</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedUserHistory.map((entry) => (
                    <tr key={entry.id} className="border-t border-[hsl(240,5%,16%)]">
                      <td className="px-3 py-2">{formatDate(entry.created_at)}</td>
                      <td className="px-3 py-2">{entry.action}</td>
                      <td className="px-3 py-2">{entry.subscription_plans?.name || "-"}</td>
                      <td className="px-3 py-2">{entry.previous_plan?.name || "-"}</td>
                      <td className="px-3 py-2">{entry.changed_by}</td>
                      <td className="px-3 py-2">{entry.reason || "-"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="rounded-lg border border-[hsl(240,5%,16%)] overflow-auto max-h-[300px]">
              <table className="w-full text-sm">
                <thead className="bg-[hsl(240,10%,8%)] text-left">
                  <tr>
                    <th className="px-3 py-2">Purchase Date</th>
                    <th className="px-3 py-2">Credits</th>
                    <th className="px-3 py-2">Amount (USD)</th>
                    <th className="px-3 py-2">Method</th>
                    <th className="px-3 py-2">Ref</th>
                    <th className="px-3 py-2">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedUserPurchases.map((purchase) => (
                    <tr key={purchase.id} className="border-t border-[hsl(240,5%,16%)]">
                      <td className="px-3 py-2">{formatDate(purchase.purchased_at)}</td>
                      <td className="px-3 py-2">{purchase.credits}</td>
                      <td className="px-3 py-2">{Number(purchase.amount_usd ?? 0).toFixed(2)}</td>
                      <td className="px-3 py-2">{purchase.payment_method || "-"}</td>
                      <td className="px-3 py-2">{purchase.payment_ref || "-"}</td>
                      <td className="px-3 py-2">{purchase.status}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {view === "audit" && (
          <div className="rounded-lg border border-[hsl(240,5%,16%)] overflow-auto max-h-[640px]">
            <table className="w-full text-sm">
              <thead className="bg-[hsl(240,10%,8%)] text-left">
                <tr>
                  <th className="px-3 py-2">Timestamp</th>
                  <th className="px-3 py-2">Action</th>
                  <th className="px-3 py-2">Target User</th>
                  <th className="px-3 py-2">Details</th>
                </tr>
              </thead>
              <tbody>
                {auditLogs.map((log) => (
                  <tr key={log.id} className="border-t border-[hsl(240,5%,16%)] align-top">
                    <td className="px-3 py-2">{formatDate(log.created_at)}</td>
                    <td className="px-3 py-2">{log.action}</td>
                    <td className="px-3 py-2">{log.target_user_id || "-"}</td>
                    <td className="px-3 py-2">
                      <details>
                        <summary className="cursor-pointer text-primary">View JSON</summary>
                        <pre className="mt-2 text-xs overflow-auto max-w-[560px] whitespace-pre-wrap">{JSON.stringify(log.details || {}, null, 2)}</pre>
                      </details>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </main>
    </div>
  );
}
