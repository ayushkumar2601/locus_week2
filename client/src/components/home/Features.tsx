import { motion } from "framer-motion";

const modules = [
  {
    id: "01",
    title: "DEPLOYMENT ENGINE",
    description: "Autonomous infrastructure provisioning and configuration management.",
  },
  {
    id: "02", 
    title: "SELF-HEALING SYSTEM",
    description: "Real-time failure detection with automated recovery protocols.",
  },
  {
    id: "03",
    title: "MONITORING CORE",
    description: "Comprehensive system surveillance and performance analytics.",
  },
  {
    id: "04",
    title: "AI DECISION UNIT",
    description: "Intelligent resource allocation and scaling optimization.",
  },
];

export default function Features() {
  return (
    <section id="modules" className="py-32 relative">
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
            <span className="text-xs font-mono tracking-widest text-primary uppercase">ACTIVE MODULES</span>
          </div>
          <h2 className="text-4xl md:text-6xl font-mono font-black tracking-wider uppercase">
            SYSTEM MODULES
          </h2>
        </motion.div>

        {/* Modules Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {modules.map((module, i) => (
            <motion.div
              key={module.id}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: i * 0.1 }}
              viewport={{ once: true }}
              className="group relative"
            >
              <div className="terminal-bg p-8 cyber-border cyber-glow-hover transition-all duration-300 relative overflow-hidden">
                
                {/* Module ID */}
                <div className="absolute top-4 right-4 text-xs font-mono text-primary/60 tracking-widest">
                  _{module.id}
                </div>
                
                {/* Status Indicator */}
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-2 h-2 bg-primary pulse-cyber"></div>
                  <span className="text-xs font-mono text-primary tracking-wider">OPERATIONAL</span>
                </div>
                
                {/* Module Title */}
                <h3 className="text-xl font-mono font-bold tracking-wider uppercase mb-4 text-foreground">
                  [{module.id}] {module.title}
                </h3>
                
                {/* Description */}
                <p className="text-sm text-muted-foreground font-mono leading-relaxed">
                  // {module.description}
                </p>
                
                {/* Hover Effect Lines */}
                <div className="absolute bottom-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-primary/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
              </div>
            </motion.div>
          ))}
        </div>

        {/* System Status Footer */}
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          transition={{ duration: 0.8, delay: 0.5 }}
          viewport={{ once: true }}
          className="mt-16 pt-8 border-t border-primary/20"
        >
          <div className="flex items-center justify-between text-xs font-mono text-muted-foreground tracking-wider">
            <div>// ALL MODULES SYNCHRONIZED</div>
            <div>// SYSTEM INTEGRITY: 100%</div>
            <div>// LAST UPDATE: {new Date().toLocaleString()}</div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
