import { motion } from "framer-motion";
import { Terminal, Activity, Zap, CheckCircle } from "lucide-react";

export default function DashboardPreview() {
  return (
    <section className="py-32 relative">
      <div className="container mx-auto px-6">
        
        {/* Section Header */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          viewport={{ once: true }}
          className="mb-16"
        >
          <div className="flex items-center gap-4 mb-4">
            <div className="w-8 h-px bg-primary"></div>
            <span className="text-xs font-mono tracking-widest text-primary uppercase">SYSTEM INTERFACE</span>
          </div>
          <h2 className="text-4xl md:text-6xl font-mono font-black tracking-wider uppercase mb-4">
            CONTROL PANEL
          </h2>
          <p className="text-muted-foreground font-mono text-sm tracking-wide">
            // REAL-TIME INFRASTRUCTURE MONITORING AND CONTROL
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.2 }}
          viewport={{ once: true }}
          className="max-w-6xl mx-auto"
        >
          <div className="terminal-bg cyber-border cyber-glow-hover relative overflow-hidden">
            
            {/* Terminal Header */}
            <div className="flex items-center justify-between p-6 border-b border-primary/20">
              <div className="flex items-center gap-4">
                <Terminal className="w-5 h-5 text-primary" />
                <span className="font-mono text-sm tracking-wider uppercase text-primary">FLOCUS CONTROL TERMINAL</span>
              </div>
              <div className="flex items-center gap-6 text-xs font-mono text-muted-foreground tracking-wider">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-primary pulse-cyber"></div>
                  <span>UPTIME: 99.9%</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-primary flicker"></div>
                  <span>ACTIVE NODES: 3</span>
                </div>
              </div>
            </div>

            {/* Terminal Content */}
            <div className="p-6 grid grid-cols-1 lg:grid-cols-3 gap-8">
              
              {/* Deployment Status */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-3 h-px bg-primary"></div>
                  <h3 className="text-xs font-mono text-primary tracking-widest uppercase">
                    DEPLOYMENT LOG
                  </h3>
                </div>
                <div className="space-y-3">
                  {[
                    { name: "api-service", status: "deployed", time: "0x02m", code: "200" },
                    { name: "web-frontend", status: "deploying", time: "0x05m", code: "102" },
                    { name: "worker-queue", status: "deployed", time: "0x12m", code: "200" },
                  ].map((deployment, i) => (
                    <div key={i} className="cyber-border p-3 bg-background/20">
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-2">
                          <div className={`w-1 h-1 ${
                            deployment.status === 'deployed' ? 'bg-primary' : 'bg-yellow-400'
                          } pulse-cyber`}></div>
                          <span className="text-xs font-mono text-foreground tracking-wider">
                            {deployment.name.toUpperCase()}
                          </span>
                        </div>
                        <span className="text-xs font-mono text-muted-foreground">{deployment.time}</span>
                      </div>
                      <div className="text-xs font-mono text-muted-foreground">
                        STATUS: {deployment.code} | {deployment.status.toUpperCase()}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* System Metrics */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-3 h-px bg-primary"></div>
                  <h3 className="text-xs font-mono text-primary tracking-widest uppercase">
                    SYSTEM METRICS
                  </h3>
                </div>
                <div className="space-y-3">
                  {[
                    { metric: "CPU_USAGE", value: "23", unit: "%", status: "NOMINAL" },
                    { metric: "MEMORY_ALLOC", value: "67", unit: "%", status: "NOMINAL" },
                    { metric: "DISK_IO", value: "12", unit: "%", status: "NOMINAL" },
                    { metric: "NETWORK_LAT", value: "8", unit: "ms", status: "OPTIMAL" },
                  ].map((metric, i) => (
                    <div key={i} className="cyber-border p-3 bg-background/20">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-mono text-foreground tracking-wider">
                          {metric.metric}
                        </span>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-mono text-primary">
                            {metric.value}{metric.unit}
                          </span>
                          <div className="w-1 h-1 bg-primary pulse-cyber"></div>
                        </div>
                      </div>
                      <div className="text-xs font-mono text-muted-foreground">
                        STATUS: {metric.status}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Terminal Output */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-3 h-px bg-primary"></div>
                  <h3 className="text-xs font-mono text-primary tracking-widest uppercase">
                    LIVE TERMINAL
                  </h3>
                </div>
                <div className="cyber-border bg-background/40 p-4 font-mono text-xs space-y-2 min-h-[200px]">
                  <div className="text-primary">$ flocus --status</div>
                  <div className="text-primary">✓ HEALTH_CHECK: PASSED</div>
                  <div className="text-primary">→ SCALING: 3_INSTANCES</div>
                  <div className="text-primary">✓ DEPLOYMENT: SUCCESS</div>
                  <div className="text-muted-foreground">  [2024.04.23_22:01:23]</div>
                  <div className="text-primary">→ MONITORING: ACTIVE</div>
                  <div className="text-muted-foreground">  [2024.04.23_22:01:24]</div>
                  <div className="text-primary flicker">█</div>
                </div>
              </div>
            </div>

            {/* System Status Footer */}
            <div className="px-6 py-4 border-t border-primary/20 bg-background/20">
              <div className="flex items-center justify-between text-xs font-mono text-muted-foreground tracking-wider">
                <div>// CLEARANCE: AUTHORIZED</div>
                <div>// NODE_ID: FLOCUS_PRIME</div>
                <div>// SYNC: {new Date().toLocaleTimeString()}</div>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}