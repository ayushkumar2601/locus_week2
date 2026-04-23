import { motion } from "framer-motion";

export default function ValueSection() {
  return (
    <section className="py-32 relative grid-cyber">
      <div className="container mx-auto px-6">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          viewport={{ once: true }}
          className="max-w-4xl mx-auto"
        >
          
          {/* Section Header */}
          <div className="mb-16">
            <div className="flex items-center gap-4 mb-4">
              <div className="w-8 h-px bg-primary"></div>
              <span className="text-xs font-mono tracking-widest text-primary uppercase">OPERATIONAL OVERVIEW</span>
            </div>
          </div>

          {/* Three Column Layout */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
            
            {/* Context */}
            <motion.div
              initial={{ opacity: 0, x: -30 }}
              whileInView={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6, delay: 0.1 }}
              viewport={{ once: true }}
              className="space-y-6"
            >
              <div className="cyber-border p-6 terminal-bg">
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-2 h-2 bg-primary pulse-cyber"></div>
                  <h3 className="text-sm font-mono tracking-widest text-primary uppercase">
                    // CONTEXT
                  </h3>
                </div>
                <div className="space-y-3 text-sm font-mono text-muted-foreground leading-relaxed">
                  <div>INFRASTRUCTURE COMPLEXITY</div>
                  <div>MANUAL DEPLOYMENT OVERHEAD</div>
                  <div>SYSTEM FAILURE RECOVERY</div>
                  <div>RESOURCE OPTIMIZATION</div>
                </div>
              </div>
            </motion.div>

            {/* Operations */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              viewport={{ once: true }}
              className="space-y-6"
            >
              <div className="cyber-border p-6 terminal-bg">
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-2 h-2 bg-primary pulse-cyber"></div>
                  <h3 className="text-sm font-mono tracking-widest text-primary uppercase">
                    // OPERATIONS
                  </h3>
                </div>
                <div className="space-y-3 text-sm font-mono text-muted-foreground leading-relaxed">
                  <div>AUTONOMOUS DEPLOYMENT</div>
                  <div>REAL-TIME MONITORING</div>
                  <div>SELF-HEALING PROTOCOLS</div>
                  <div>INTELLIGENT SCALING</div>
                </div>
              </div>
            </motion.div>

            {/* Execution */}
            <motion.div
              initial={{ opacity: 0, x: 30 }}
              whileInView={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6, delay: 0.3 }}
              viewport={{ once: true }}
              className="space-y-6"
            >
              <div className="cyber-border p-6 terminal-bg">
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-2 h-2 bg-primary pulse-cyber"></div>
                  <h3 className="text-sm font-mono tracking-widest text-primary uppercase">
                    // EXECUTION
                  </h3>
                </div>
                <div className="space-y-3 text-sm font-mono text-muted-foreground leading-relaxed">
                  <div>ZERO DOWNTIME DEPLOYMENT</div>
                  <div>AUTOMATED RECOVERY</div>
                  <div>OPTIMIZED PERFORMANCE</div>
                  <div>REDUCED OPERATIONAL COST</div>
                </div>
              </div>
            </motion.div>
          </div>

          {/* Bottom Summary */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.4 }}
            viewport={{ once: true }}
            className="mt-16 text-center"
          >
            <div className="cyber-border p-8 terminal-bg max-w-2xl mx-auto">
              <h2 className="text-2xl md:text-4xl font-mono font-black tracking-wider uppercase mb-4 text-foreground">
                ELIMINATE DEVOPS OVERHEAD
              </h2>
              <p className="text-sm font-mono text-muted-foreground tracking-wide">
                // AUTOMATE. OPTIMIZE. SCALE. REPEAT.
              </p>
            </div>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}