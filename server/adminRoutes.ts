import { Router } from "express";
import { assertSupabaseConfigured, supabase } from "./supabase";
import {
  requireAdmin,
  generateAdminToken,
  invalidateAdminToken,
  ADMIN_EMAIL,
  ADMIN_SECRET_KEY,
} from "./adminAuth";

const router = Router();

function isMissingSupabaseRelation(error: { message?: string } | null | undefined): boolean {
  const message = (error?.message || "").toLowerCase();
  if (!message) {
    return false;
  }

  return (
    message.includes("schema cache") ||
    message.includes("could not find the table") ||
    message.includes("relation") && message.includes("does not exist")
  );
}

function referencesTable(error: { message?: string } | null | undefined, tableName: string): boolean {
  const message = (error?.message || "").toLowerCase();
  const normalized = tableName.toLowerCase();
  return message.includes(normalized) || message.includes(`public.${normalized}`);
}

async function writeAdminAuditLog(entry: {
  admin_email: string;
  action: string;
  target_user_id?: string | null;
  details?: Record<string, unknown>;
}) {
  const { error } = await supabase.from("admin_audit_log").insert({
    admin_email: entry.admin_email,
    action: entry.action,
    target_user_id: entry.target_user_id ?? null,
    details: entry.details ?? {},
  });

  if (error && !isMissingSupabaseRelation(error)) {
    console.warn("Failed to write admin audit log:", error.message);
  }
}

router.use((_req, res, next) => {
  try {
    assertSupabaseConfigured();
    next();
  } catch (error) {
    const message = error instanceof Error ? error.message : "Supabase is not configured";
    return res.status(500).json({ error: message });
  }
});

router.post("/login", async (req, res) => {
  const { email, password } = req.body as { email?: string; password?: string };
  if (email !== ADMIN_EMAIL || password !== ADMIN_SECRET_KEY) {
    return res.status(401).json({ error: "Invalid admin credentials" });
  }

  const token = generateAdminToken();

  await writeAdminAuditLog({
    admin_email: email,
    action: "admin_login",
    details: { ip: req.ip },
  });

  return res.json({ token });
});

router.post("/logout", requireAdmin, async (req, res) => {
  const token = req.headers.authorization!.slice(7);
  invalidateAdminToken(token);

  await writeAdminAuditLog({
    admin_email: ADMIN_EMAIL,
    action: "admin_logout",
    details: { ip: req.ip },
  });

  return res.json({ success: true });
});

router.get("/users", requireAdmin, async (_req, res) => {
  const usersRes = await supabase
    .from("users")
    .select("id, email, username, created_at, is_active, is_suspended")
    .order("created_at", { ascending: false });

  if (usersRes.error) {
    return res.status(500).json({ error: usersRes.error.message });
  }

  const subsRes = await supabase
    .from("user_subscriptions")
    .select("user_id, plan_id, status, started_at, expires_at, ai_calls_used");

  if (subsRes.error && !(isMissingSupabaseRelation(subsRes.error) && referencesTable(subsRes.error, "user_subscriptions"))) {
    return res.status(500).json({ error: subsRes.error.message });
  }

  const plansRes = await supabase
    .from("subscription_plans")
    .select("id, name, max_ai_calls, price_usd");

  if (plansRes.error && !(isMissingSupabaseRelation(plansRes.error) && referencesTable(plansRes.error, "subscription_plans"))) {
    return res.status(500).json({ error: plansRes.error.message });
  }

  const plansById = new Map<string, { id: string; name: string; max_ai_calls: number | null; price_usd: number | null }>();
  for (const plan of plansRes.data || []) {
    plansById.set(plan.id, plan);
  }

  const subscriptionsByUser = new Map<string, Array<{
    status: string | null;
    started_at: string | null;
    expires_at: string | null;
    ai_calls_used: number | null;
    subscription_plans?: { id: string; name: string; max_ai_calls: number | null; price_usd: number | null };
  }>>();

  for (const sub of subsRes.data || []) {
    const existing = subscriptionsByUser.get(sub.user_id) || [];
    const plan = sub.plan_id ? plansById.get(sub.plan_id) : undefined;

    existing.push({
      status: sub.status,
      started_at: sub.started_at,
      expires_at: sub.expires_at,
      ai_calls_used: sub.ai_calls_used,
      ...(plan ? { subscription_plans: plan } : {}),
    });

    subscriptionsByUser.set(sub.user_id, existing);
  }

  const creditsRes = await supabase
    .from("credit_purchases")
    .select("user_id, credits, amount_usd")
    .eq("status", "completed");

  const totalsByUser = new Map<string, { creditsPurchased: number; totalSpent: number }>();
  if (!creditsRes.error && creditsRes.data) {
    for (const row of creditsRes.data as Array<{ user_id: string; credits: number | null; amount_usd: number | null }>) {
      const existing = totalsByUser.get(row.user_id) || { creditsPurchased: 0, totalSpent: 0 };
      totalsByUser.set(row.user_id, {
        creditsPurchased: existing.creditsPurchased + (row.credits ?? 0),
        totalSpent: existing.totalSpent + Number(row.amount_usd ?? 0),
      });
    }
  }

  const enrichedUsers = (usersRes.data || []).map((user) => {
    const totals = totalsByUser.get(user.id) || { creditsPurchased: 0, totalSpent: 0 };
    return {
      ...user,
      user_subscriptions: subscriptionsByUser.get(user.id) || [],
      credits_purchased: totals.creditsPurchased,
      total_spent_usd: totals.totalSpent,
    };
  });

  return res.json({ users: enrichedUsers });
});

router.get("/users/:userId", requireAdmin, async (req, res) => {
  const userId = Array.isArray(req.params.userId) ? req.params.userId[0] : req.params.userId;

  const [userRes, subRes, historyRes, purchasesRes] = await Promise.all([
    supabase
      .from("users")
      .select("id, email, username, created_at, is_active, is_suspended")
      .eq("id", userId)
      .single(),

    supabase
      .from("user_subscriptions")
      .select("user_id, plan_id, status, started_at, expires_at, ai_calls_used")
      .eq("user_id", userId),

    supabase
      .from("subscription_history")
      .select(`
        id, action, changed_by, reason, created_at,
        subscription_plans ( name ),
        previous_plan:subscription_plans!previous_plan_id ( name )
      `)
      .eq("user_id", userId)
      .order("created_at", { ascending: false }),

    supabase
      .from("credit_purchases")
      .select("id, credits, amount_usd, payment_method, payment_ref, status, purchased_at")
      .eq("user_id", userId)
      .order("purchased_at", { ascending: false }),
  ]);

  if (userRes.error) {
    return res.status(404).json({ error: "User not found" });
  }

  let subscriptionPlansById = new Map<string, { id: string; name: string; max_ai_calls: number | null; price_usd: number | null }>();
  if (!subRes.error && (subRes.data || []).length > 0) {
    const plansRes = await supabase
      .from("subscription_plans")
      .select("id, name, max_ai_calls, price_usd");

    if (!plansRes.error) {
      subscriptionPlansById = new Map(
        (plansRes.data || []).map((plan) => [plan.id, plan]),
      );
    }
  }

  const userSubscriptions = (subRes.data || []).map((sub) => {
    const plan = sub.plan_id ? subscriptionPlansById.get(sub.plan_id) : undefined;
    return {
      status: sub.status,
      started_at: sub.started_at,
      expires_at: sub.expires_at,
      ai_calls_used: sub.ai_calls_used,
      ...(plan ? { subscription_plans: plan } : {}),
    };
  });

  return res.json({
    user: {
      ...userRes.data,
      user_subscriptions: userSubscriptions,
    },
    history: historyRes.error && isMissingSupabaseRelation(historyRes.error)
      ? []
      : (historyRes.data || []),
    purchases: purchasesRes.error && isMissingSupabaseRelation(purchasesRes.error)
      ? []
      : (purchasesRes.data || []),
  });
});

router.post("/users/:userId/subscription", requireAdmin, async (req, res) => {
  const userId = Array.isArray(req.params.userId) ? req.params.userId[0] : req.params.userId;
  const { planId, reason } = req.body as { planId?: string; reason?: string };
  const adminEmail = ADMIN_EMAIL;

  if (!planId) {
    return res.status(400).json({ error: "planId is required" });
  }

  const { data: currentSub } = await supabase
    .from("user_subscriptions")
    .select("plan_id")
    .eq("user_id", userId)
    .single();

  const { error: subError } = await supabase
    .from("user_subscriptions")
    .upsert(
      {
        user_id: userId,
        plan_id: planId,
        status: "active",
        started_at: new Date().toISOString(),
        ai_calls_used: 0,
      },
      { onConflict: "user_id" },
    );

  if (subError) {
    return res.status(500).json({ error: subError.message });
  }

  const action = currentSub ? "upgraded" : "assigned";

  await supabase.from("subscription_history").insert({
    user_id: userId,
    plan_id: planId,
    action,
    changed_by: adminEmail,
    reason: reason ?? null,
    previous_plan_id: currentSub?.plan_id ?? null,
  });

  await writeAdminAuditLog({
    admin_email: adminEmail,
    action: "subscription_change",
    target_user_id: userId,
    details: { planId, reason, previousPlanId: currentSub?.plan_id ?? null },
  });

  return res.json({ success: true });
});

router.post("/users/:userId/suspend", requireAdmin, async (req, res) => {
  const userId = Array.isArray(req.params.userId) ? req.params.userId[0] : req.params.userId;
  const { reason } = req.body as { reason?: string };

  const { error: updateError } = await supabase
    .from("users")
    .update({ is_suspended: true, is_active: false })
    .eq("id", userId);

  if (updateError) {
    return res.status(500).json({ error: updateError.message });
  }

  await supabase.from("subscription_history").insert({
    user_id: userId,
    plan_id: null,
    action: "suspended",
    changed_by: ADMIN_EMAIL,
    reason: reason ?? null,
    previous_plan_id: null,
  });

  await writeAdminAuditLog({
    admin_email: ADMIN_EMAIL,
    action: "user_suspended",
    target_user_id: userId,
    details: { reason: reason ?? null },
  });

  return res.json({ success: true });
});

router.post("/users/:userId/reactivate", requireAdmin, async (req, res) => {
  const userId = Array.isArray(req.params.userId) ? req.params.userId[0] : req.params.userId;

  const { error: updateError } = await supabase
    .from("users")
    .update({ is_suspended: false, is_active: true })
    .eq("id", userId);

  if (updateError) {
    return res.status(500).json({ error: updateError.message });
  }

  await supabase.from("subscription_history").insert({
    user_id: userId,
    plan_id: null,
    action: "reactivated",
    changed_by: ADMIN_EMAIL,
    reason: null,
    previous_plan_id: null,
  });

  await writeAdminAuditLog({
    admin_email: ADMIN_EMAIL,
    action: "user_reactivated",
    target_user_id: userId,
    details: {},
  });

  return res.json({ success: true });
});

router.get("/plans", requireAdmin, async (_req, res) => {
  const { data, error } = await supabase
    .from("subscription_plans")
    .select("*")
    .order("price_usd", { ascending: true });

  if (error) {
    if (isMissingSupabaseRelation(error) && referencesTable(error, "subscription_plans")) {
      return res.json({ plans: [] });
    }
    return res.status(500).json({ error: error.message });
  }

  return res.json({ plans: data || [] });
});

router.get("/audit-log", requireAdmin, async (_req, res) => {
  const { data, error } = await supabase
    .from("admin_audit_log")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(200);

  if (error) {
    if (isMissingSupabaseRelation(error) && referencesTable(error, "admin_audit_log")) {
      return res.json({ logs: [] });
    }
    return res.status(500).json({ error: error.message });
  }

  return res.json({ logs: data || [] });
});

router.get("/stats", requireAdmin, async (_req, res) => {
  const [usersRes, subsRes, historyRes, creditsRes] = await Promise.all([
    supabase.from("users").select("id, is_suspended, created_at"),
    supabase.from("user_subscriptions").select("status, plan_id, ai_calls_used"),
    supabase
      .from("subscription_history")
      .select("created_at, action")
      .gte("created_at", new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()),
    supabase
      .from("credit_purchases")
      .select("credits, amount_usd")
      .eq("status", "completed"),
  ]);

  if (usersRes.error) {
    return res.status(500).json({ error: usersRes.error.message });
  }

  if (subsRes.error && !(isMissingSupabaseRelation(subsRes.error) && referencesTable(subsRes.error, "user_subscriptions"))) {
    return res.status(500).json({ error: subsRes.error.message });
  }

  if (historyRes.error && !(isMissingSupabaseRelation(historyRes.error) && referencesTable(historyRes.error, "subscription_history"))) {
    return res.status(500).json({ error: historyRes.error.message });
  }

  if (creditsRes.error && !(isMissingSupabaseRelation(creditsRes.error) && referencesTable(creditsRes.error, "credit_purchases"))) {
    return res.status(500).json({ error: creditsRes.error.message });
  }

  const totalCreditsPurchased = creditsRes.data?.reduce((sum, row) => sum + (row.credits ?? 0), 0) ?? 0;
  const totalCreditRevenue = creditsRes.data?.reduce((sum, row) => sum + Number(row.amount_usd ?? 0), 0) ?? 0;

  return res.json({
    totalUsers: usersRes.data?.length ?? 0,
    activeUsers: usersRes.data?.filter((u) => !u.is_suspended).length ?? 0,
    suspendedUsers: usersRes.data?.filter((u) => u.is_suspended).length ?? 0,
    activeSubscriptions: subsRes.data?.filter((s) => s.status === "active").length ?? 0,
    totalAiCallsUsed: subsRes.data?.reduce((sum, s) => sum + (s.ai_calls_used ?? 0), 0) ?? 0,
    recentActions: historyRes.data?.length ?? 0,
    totalCreditsPurchased,
    totalCreditRevenue,
  });
});

export default router;
