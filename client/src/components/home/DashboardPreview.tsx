import { motion } from "framer-motion";
import { Terminal, Activity, Zap, CheckCircle } from "lucide-react";

export default function DashboardPreview() {
  return (
    <section className="py-32 relative">
      <div className="container mx-auto px-6">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <p className="text-muted-foreground text-lg mb-8">
            Control your infrastructure in real-time.
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.2 }}
          viewport={{ once: true }}
          className="max-w-5xl mx-auto"
        >
          <div className="bg-card border border-border/20 rounded-2xl p-8 shadow-subtle">
            {/* Dashboard Header */}
            <div className="flex items-center justify-between mb-8 pb-6 border-b border-border/20">
              <div className="flex items-center gap-3">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <span className="text-sm font-medium">Production Environment</span>
              </div>
              <div className="flex items-center gap-6 text-sm text-muted-foreground">
                <div className="flex items-center gap-2">
                  <Activity className="w-4 h-4" />
                  <span>99.9% Uptime</span>
                </div>
                <div className="flex items-center gap-2">
                  <Zap className="w-4 h-4" />
                  <span>3 Active Deployments</span>
                </div>
              </div>
            </div>

            {/* Dashboard Content */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Deployment Status */}
              <div className="space-y-4">
                <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
                  Recent Deployments
                </h3>
                <div className="space-y-3">
                  {[
                    { name: "api-service", status: "deployed", time: "2m ago" },
                    { name: "web-frontend", status: "deploying", time: "5m ago" },
                    { name: "worker-queue", status: "deployed", time: "12m ago" },
                  ].map((deployment, i) => (
                    <div key={i} className="flex items-center justify-between py-2">
                      <div className="flex items-center gap-3">
                        <div className={`w-2 h-2 rounded-full ${
                          deployment.status === 'deployed' ? 'bg-green-500' : 'bg-yellow-500'
                        }`}></div>
                        <span className="text-sm font-mono">{deployment.name}</span>
                      </div>
                      <span className="text-xs text-muted-foreground">{deployment.time}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* System Health */}
              <div className="space-y-4">
                <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
                  System Health
                </h3>
                <div className="space-y-3">
                  {[
                    { metric: "CPU Usage", value: "23%", status: "good" },
                    { metric: "Memory", value: "67%", status: "good" },
                    { metric: "Disk I/O", value: "12%", status: "good" },
                  ].map((metric, i) => (
                    <div key={i} className="flex items-center justify-between py-2">
                      <span className="text-sm">{metric.metric}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-mono">{metric.value}</span>
                        <CheckCircle className="w-3 h-3 text-green-500" />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Terminal Output */}
              <div className="space-y-4">
                <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
                  Live Logs
                </h3>
                <div className="bg-background border border-border/20 rounded-lg p-4 font-mono text-xs space-y-1">
                  <div className="text-green-400">✓ Health check passed</div>
                  <div className="text-blue-400">→ Scaling to 3 instances</div>
                  <div className="text-green-400">✓ Deployment successful</div>
                  <div className="text-muted-foreground">  2024-04-23 22:01:23</div>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}