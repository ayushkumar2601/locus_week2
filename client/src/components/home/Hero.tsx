import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";
import { motion } from "framer-motion";
import { Link } from "wouter";

export default function Hero() {
  return (
    <section className="relative min-h-screen flex items-center justify-center grid-cyber scanlines">
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-primary/5 to-transparent"></div>
      
      <div className="container mx-auto px-6 relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          
          {/* Left Side - Main Content */}
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="space-y-8"
          >
            {/* System Status */}
            <div className="flex items-center gap-4 text-xs font-mono tracking-widest uppercase">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-primary pulse-cyber"></div>
                <span className="text-primary">SYSTEM ONLINE</span>
              </div>
              <div className="w-px h-4 bg-border"></div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-primary flicker"></div>
                <span className="text-muted-foreground">AGENT STATUS: ACTIVE</span>
              </div>
            </div>

            {/* Main Heading */}
            <div className="space-y-4">
              <h1 className="text-6xl md:text-8xl font-mono font-black tracking-wider leading-none">
                <div className="text-foreground">DEPLOY</div>
                <div className="text-foreground">FIX</div>
                <div className="text-primary">SCALE</div>
              </h1>
              
              <div className="text-lg md:text-xl text-muted-foreground font-mono tracking-wide max-w-lg">
                // AUTONOMOUS AI INFRASTRUCTURE CONTROL
              </div>
            </div>

            {/* CTA Button */}
            <Link href="/workspace">
              <Button 
                className="bg-transparent border-2 border-primary text-primary hover:bg-primary hover:text-primary-foreground transition-all duration-300 h-14 px-8 text-base font-mono tracking-widest uppercase cyber-glow-hover group"
              >
                [ INITIATE DEPLOYMENT ]
                <ArrowRight className="ml-3 w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </Button>
            </Link>

            {/* Additional System Info */}
            <div className="pt-8 space-y-2 text-xs font-mono text-muted-foreground tracking-wider">
              <div>// CLEARANCE LEVEL: AUTHORIZED</div>
              <div>// DEPLOYMENT NODE: ACTIVE</div>
              <div>// LAST SYNC: {new Date().toLocaleTimeString()}</div>
            </div>
          </motion.div>

          {/* Right Side - Animated Element */}
          <motion.div
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8, delay: 0.4 }}
            className="flex items-center justify-center"
          >
            <div className="relative">
              {/* Central Orb */}
              <div className="w-64 h-64 relative">
                <div className="absolute inset-0 border border-primary/30 cyber-border"></div>
                <div className="absolute inset-4 border border-primary/50 cyber-border"></div>
                <div className="absolute inset-8 border border-primary/70 cyber-border"></div>
                <div className="absolute inset-12 bg-primary/10 cyber-glow flex items-center justify-center">
                  <div className="text-primary font-mono text-sm tracking-widest text-center">
                    <div>FLOCUS</div>
                    <div className="text-xs mt-1">CORE</div>
                  </div>
                </div>
              </div>
              
              {/* Corner Brackets */}
              <div className="absolute -top-2 -left-2 w-8 h-8 border-l-2 border-t-2 border-primary"></div>
              <div className="absolute -top-2 -right-2 w-8 h-8 border-r-2 border-t-2 border-primary"></div>
              <div className="absolute -bottom-2 -left-2 w-8 h-8 border-l-2 border-b-2 border-primary"></div>
              <div className="absolute -bottom-2 -right-2 w-8 h-8 border-r-2 border-b-2 border-primary"></div>
            </div>
          </motion.div>

        </div>
      </div>
    </section>
  );
}
