import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";
import { Link } from "wouter";

export default function FinalCTA() {
  return (
    <section className="py-32 relative scanlines">
      <div className="absolute inset-0 bg-gradient-to-t from-primary/5 via-transparent to-transparent"></div>
      
      <div className="container mx-auto px-6 relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          viewport={{ once: true }}
          className="max-w-4xl mx-auto text-center"
        >
          
          {/* Section Header */}
          <div className="mb-12">
            <div className="flex items-center justify-center gap-4 mb-6">
              <div className="w-12 h-px bg-primary"></div>
              <span className="text-xs font-mono tracking-widest text-primary uppercase">DEPLOYMENT READY</span>
              <div className="w-12 h-px bg-primary"></div>
            </div>
          </div>

          {/* Main CTA Content */}
          <div className="cyber-border terminal-bg p-12 relative overflow-hidden">
            
            {/* Corner Brackets */}
            <div className="absolute top-4 left-4 w-6 h-6 border-l-2 border-t-2 border-primary"></div>
            <div className="absolute top-4 right-4 w-6 h-6 border-r-2 border-t-2 border-primary"></div>
            <div className="absolute bottom-4 left-4 w-6 h-6 border-l-2 border-b-2 border-primary"></div>
            <div className="absolute bottom-4 right-4 w-6 h-6 border-r-2 border-b-2 border-primary"></div>
            
            {/* Status Indicators */}
            <div className="flex items-center justify-center gap-8 mb-8 text-xs font-mono tracking-widest">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-primary pulse-cyber"></div>
                <span className="text-primary">SYSTEM READY</span>
              </div>
              <div className="w-px h-4 bg-border"></div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-primary flicker"></div>
                <span className="text-muted-foreground">AWAITING AUTHORIZATION</span>
              </div>
            </div>

            {/* Main Heading */}
            <h2 className="text-3xl md:text-5xl font-mono font-black tracking-wider uppercase mb-6 text-foreground">
              READY TO DEPLOY?
            </h2>
            
            <p className="text-sm font-mono text-muted-foreground tracking-wide mb-8">
              // INITIATE AUTONOMOUS INFRASTRUCTURE CONTROL
            </p>
            
            {/* CTA Button */}
            <Link href="/workspace">
              <Button 
                className="bg-transparent border-2 border-primary text-primary hover:bg-primary hover:text-primary-foreground transition-all duration-300 h-16 px-12 text-lg font-mono tracking-widest uppercase cyber-glow-hover group"
              >
                [ LAUNCH FLOCUS ]
                <ArrowRight className="ml-4 w-6 h-6 group-hover:translate-x-2 transition-transform" />
              </Button>
            </Link>

            {/* Authorization Footer */}
            <div className="mt-8 pt-6 border-t border-primary/20 text-xs font-mono text-muted-foreground tracking-wider">
              <div>// CLEARANCE LEVEL: AUTHORIZED</div>
              <div>// DEPLOYMENT PROTOCOL: ACTIVE</div>
            </div>
          </div>

          {/* System Status */}
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            transition={{ duration: 0.8, delay: 0.3 }}
            viewport={{ once: true }}
            className="mt-8 text-xs font-mono text-muted-foreground tracking-wider"
          >
            <div>// FLOCUS CONTROL SYSTEM v2.1.0</div>
            <div>// LAST SYNC: {new Date().toLocaleString()}</div>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}