import { useEffect, useState } from "react";
import { Link } from "wouter";
import { useLocation } from "wouter";
import { ArrowLeft, Clock, Code2, Cpu, Settings, Zap, ArrowRight, CheckCircle2, PackageOpen, Plus, Loader2, PenTool, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { apiRequest, clearAuthToken } from "@/lib/queryClient";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type WorkItem = {
  id: string;
  name: string;
  type: string;
  date: string;
  status: "Completed" | "In Progress";
};

type DashboardData = {
  profile: {
    name: string;
    email: string;
  };
  stats: {
    totalProjects: number;
    aiGenerations: number;
  };
  history: WorkItem[];
};

export default function Dashboard() {
  const [, navigate] = useLocation();
  const [data, setData] = useState<DashboardData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [activeDialog, setActiveDialog] = useState<"settings" | "billing" | null>(null);
  const [isSigningOut, setIsSigningOut] = useState(false);

  useEffect(() => {
    let mounted = true;

    async function loadDashboard() {
      try {
        const response = await apiRequest("GET", "/api/dashboard");
        const payload = (await response.json()) as DashboardData;
        if (mounted) {
          setData(payload);
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : "Failed to load dashboard";
        if (message.startsWith("401:")) {
          navigate("/auth");
          return;
        }
        console.error(message);
      } finally {
        if (mounted) {
          setIsLoading(false);
        }
      }
    }

    void loadDashboard();

    return () => {
      mounted = false;
    };
  }, [navigate]);

  const handleNewProject = async (template: "react" | "blank" = "react") => {
    if (isCreating) return;
    setIsCreating(true);
    try {
      const res = await apiRequest("POST", "/api/projects", {
        name: "Untitled Project",
        template,
      });
      const project = await res.json();
      navigate(`/workspace?project=${project.id}`);
    } catch (error) {
      console.error("Failed to create project:", error);
      setIsCreating(false);
    }
  };

  const handleWorkItemClick = (workItem: WorkItem) => {
    navigate(`/workspace?project=${workItem.id}`);
  };

  const handleSignOut = async () => {
    if (isSigningOut) return;
    setIsSigningOut(true);

    try {
      await apiRequest("POST", "/api/auth/signout");
    } catch {
      // Fall through and clear local token anyway.
    } finally {
      clearAuthToken();
      navigate("/auth");
      setIsSigningOut(false);
    }
  };

  const profileName = data?.profile.name ?? "User";
  const profileEmail = data?.profile.email ?? "";
  const totalProjects = data?.stats.totalProjects ?? 0;
  const aiGenerations = data?.stats.aiGenerations ?? 0;
  const workHistory = data?.history ?? [];

  return (
    <div className="min-h-screen bg-[hsl(240,10%,4%)] text-foreground">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-[hsl(240,10%,5%)]/80 backdrop-blur-xl border-b border-[hsl(240,5%,12%)]">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/workspace">
              <button className="p-2 hover:bg-[hsl(240,5%,15%)] rounded-lg transition-colors text-muted-foreground hover:text-foreground">
                <ArrowLeft className="w-5 h-5" />
              </button>
            </Link>
            <div className="flex items-center gap-2">
              <span className="font-display font-semibold text-lg">Synapse</span>
              <span className="text-muted-foreground">/</span>
              <span className="font-medium text-lg">Dashboard</span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="sm"
              className="hidden sm:flex border-[hsl(240,5%,15%)] bg-[hsl(240,10%,7%)]"
              onClick={() => setActiveDialog("settings")}
            >
              <Settings className="w-4 h-4 mr-2" />
              Settings
            </Button>
            <div className="w-8 h-8 rounded-full bg-linear-to-br from-primary to-amber-500 flex items-center justify-center text-xs font-bold text-white shadow-[0_0_15px_rgba(99,144,255,0.3)]">
              U
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-6xl">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="grid grid-cols-1 lg:grid-cols-3 gap-6"
        >
          {/* Left Column (Profile & Plan) */}
          <div className="lg:col-span-1 space-y-6">
            {/* User Profile Card */}
            <div className="glass-panel p-6 rounded-2xl relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-primary/10 rounded-full blur-3xl -mr-10 -mt-10" />
              <div className="flex items-center gap-4 mb-6">
                <div className="w-16 h-16 rounded-full bg-linear-to-br from-primary to-amber-500 flex items-center justify-center text-2xl font-bold text-white shadow-lg">
                  U
                </div>
                <div>
                  <h2 className="text-xl font-bold font-display">{profileName}</h2>
                  <p className="text-sm text-muted-foreground">{profileEmail}</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4 pt-4 border-t border-[hsl(240,5%,15%)]">
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Total Projects</p>
                  <p className="text-xl font-semibold">{totalProjects}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-1">AI Generations</p>
                  <p className="text-xl font-semibold">{aiGenerations}</p>
                </div>
              </div>
            </div>

            {/* Plan Details Card */}
            <div className="bg-[hsl(240,10%,6%)] border border-[hsl(240,5%,15%)] p-6 rounded-2xl relative overflow-hidden group hover:border-primary/30 transition-colors">
              <div className="flex justify-between items-start mb-6">
                <div>
                  <h3 className="font-semibold text-lg flex items-center gap-2">
                    <Zap className="w-4 h-4 text-amber-400 fill-amber-400" />
                    Pro Plan
                  </h3>
                  <p className="text-xs text-muted-foreground mt-1">Active billing cycle</p>
                </div>
                <span className="px-2.5 py-1 rounded-full bg-primary/15 text-primary text-[10px] font-bold uppercase tracking-wider">
                  Premium
                </span>
              </div>

              <div className="space-y-4">
                <div>
                  <div className="flex justify-between text-xs mb-1.5">
                    <span className="text-muted-foreground">AI Generations</span>
                    <span className="font-medium">{aiGenerations} / Unlimited</span>
                  </div>
                  <div className="w-full bg-[hsl(240,5%,12%)] rounded-full h-1.5 overflow-hidden">
                    <div className="bg-primary h-1.5 rounded-full w-full" />
                  </div>
                </div>
                <div>
                  <div className="flex justify-between text-xs mb-1.5">
                    <span className="text-muted-foreground">Active Projects</span>
                    <span className="font-medium">{totalProjects} / ∞</span>
                  </div>
                  <div className="w-full bg-[hsl(240,5%,12%)] rounded-full h-1.5 overflow-hidden">
                    <div className="bg-amber-400 h-1.5 rounded-full w-full" />
                  </div>
                </div>
              </div>

              <Button
                className="w-full mt-6 bg-[hsl(240,5%,12%)] text-foreground hover:bg-[hsl(240,5%,18%)]"
                onClick={() => setActiveDialog("billing")}
              >
                Manage Subscription
              </Button>
            </div>
          </div>

          {/* Right Column (Work History) */}
          <div className="lg:col-span-2 space-y-6">
            {/* Quick Actions */}
            <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-5 gap-4">
              {[
                { title: "New Project", icon: PackageOpen, color: "text-blue-400", action: () => handleNewProject("react") },
                { title: "Voice Build", icon: Cpu, color: "text-amber-400", action: () => navigate("/workspace?voice=1") },
                { title: "Import Code", icon: Code2, color: "text-emerald-400", action: () => handleNewProject("blank") },
                { title: "Design Studio", icon: PenTool, color: "text-cyan-400", action: () => navigate("/design") },
                { title: "Templates", icon: Zap, color: "text-purple-400", action: () => navigate("/design?mode=templates") },
              ].map((actionItem, i) => (
                <button
                  key={i}
                  onClick={actionItem.action}
                  disabled={isCreating}
                  className="w-full flex justify-center flex-col items-center gap-3 p-4 bg-[hsl(240,10%,6%)] border border-[hsl(240,5%,15%)] rounded-xl hover:bg-[hsl(240,10%,8%)] hover:border-[hsl(240,5%,25%)] transition-all group disabled:opacity-50"
                >
                  <div className={`p-3 rounded-full bg-[hsl(240,5%,12%)] group-hover:scale-110 transition-transform`}>
                    {isCreating && (actionItem.title === "New Project" || actionItem.title === "Import Code") ? (
                      <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
                    ) : (
                      <actionItem.icon className={`w-5 h-5 ${actionItem.color}`} />
                    )}
                  </div>
                  <span className="text-xs font-medium text-muted-foreground group-hover:text-foreground">
                    {actionItem.title}
                  </span>
                </button>
              ))}
            </div>

            {/* Recent Work */}
            <div className="bg-[hsl(240,10%,6%)] border border-[hsl(240,5%,15%)] rounded-2xl overflow-hidden">
              <div className="p-5 border-b border-[hsl(240,5%,15%)] flex items-center justify-between">
                <h3 className="font-semibold flex items-center gap-2">
                  <Clock className="w-4 h-4 text-muted-foreground" />
                  Recent Work History
                </h3>
                <span className="text-xs text-muted-foreground font-medium">
                  {totalProjects} project{totalProjects !== 1 ? "s" : ""}
                </span>
              </div>
              <div className="divide-y divide-[hsl(240,5%,12%)]">
                {isLoading && (
                  <div className="p-5 text-xs text-muted-foreground flex items-center gap-2">
                    <Loader2 className="w-3 h-3 animate-spin" />
                    Loading recent work...
                  </div>
                )}
                {!isLoading && workHistory.length === 0 && (
                  <div className="p-8 text-center">
                    <PackageOpen className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
                    <p className="text-sm text-muted-foreground/60 mb-4">No projects yet</p>
                    <Button
                      size="sm"
                      onClick={() => handleNewProject("react")}
                      disabled={isCreating}
                      className="bg-primary/20 text-primary hover:bg-primary/30 border border-primary/30"
                    >
                      <Plus className="w-3 h-3 mr-1.5" />
                      Create Your First Project
                    </Button>
                  </div>
                )}
                {workHistory.map((work) => (
                  <div
                    key={work.id}
                    onClick={() => handleWorkItemClick(work)}
                    className="p-5 flex items-center justify-between hover:bg-[hsl(240,5%,8%)] transition-colors cursor-pointer group"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-lg bg-[hsl(240,5%,12%)] border border-[hsl(240,5%,18%)] flex items-center justify-center overflow-hidden shrink-0 group-hover:border-primary/50 transition-colors">
                        <Code2 className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
                      </div>
                      <div>
                        <h4 className="font-medium text-sm text-foreground/90 mb-1">
                          {work.name}
                        </h4>
                        <div className="flex items-center gap-3 text-xs text-muted-foreground">
                          <span>{work.type}</span>
                          <span className="w-1 h-1 rounded-full bg-[hsl(240,5%,20%)]" />
                          <span>{work.date}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      {work.status === "Completed" ? (
                        <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-400 text-[10px] font-medium border border-emerald-500/20">
                          <CheckCircle2 className="w-3 h-3" /> Completed
                        </span>
                      ) : (
                        <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-500/10 text-amber-400 text-[10px] font-medium border border-amber-500/20">
                          <Cpu className="w-3 h-3" /> In Progress
                        </span>
                      )}
                      <ArrowRight className="w-4 h-4 text-muted-foreground/30 group-hover:text-primary/60 transition-colors" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </motion.div>
      </main>

      <Dialog open={activeDialog === "settings"} onOpenChange={(open) => setActiveDialog(open ? "settings" : null)}>
        <DialogContent className="sm:max-w-md bg-[hsl(240,10%,6%)] border-[hsl(240,5%,15%)]">
          <DialogHeader>
            <DialogTitle>Workspace Settings</DialogTitle>
            <DialogDescription>
              Manage account-level navigation and workspace preferences.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Button variant="outline" className="w-full justify-start" onClick={() => navigate("/workspace")}>Open Latest Workspace</Button>
            <Button variant="outline" className="w-full justify-start" onClick={() => navigate("/design")}>Open Design Studio</Button>
            <Button variant="outline" className="w-full justify-start" onClick={() => navigate("/")}>Go to Home</Button>
            <Button
              variant="outline"
              className="w-full justify-start border-red-500/30 text-red-300 hover:bg-red-500/10"
              onClick={() => {
                void handleSignOut();
              }}
              disabled={isSigningOut}
            >
              <LogOut className="w-4 h-4 mr-2" />
              {isSigningOut ? "Signing out..." : "Sign Out"}
            </Button>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setActiveDialog(null)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={activeDialog === "billing"} onOpenChange={(open) => setActiveDialog(open ? "billing" : null)}>
        <DialogContent className="sm:max-w-md bg-[hsl(240,10%,6%)] border-[hsl(240,5%,15%)]">
          <DialogHeader>
            <DialogTitle>Subscription</DialogTitle>
            <DialogDescription>
              Pro plan is active. Billing portal integration can be connected in production.
            </DialogDescription>
          </DialogHeader>
          <div className="rounded-xl border border-[hsl(240,5%,15%)] bg-[hsl(240,10%,8%)] p-4 text-sm text-muted-foreground">
            <p className="mb-2">Current plan: <span className="text-foreground font-medium">Pro</span></p>
            <p className="mb-2">Projects: <span className="text-foreground font-medium">{totalProjects}</span></p>
            <p>AI generations: <span className="text-foreground font-medium">{aiGenerations}</span></p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => navigate("/workspace")}>Back to Workspace</Button>
            <Button onClick={() => setActiveDialog(null)}>Done</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
