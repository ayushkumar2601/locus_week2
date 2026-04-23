import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";
import { motion } from "framer-motion";
import { Link } from "wouter";

export default function Hero() {
  return (
    <section className="relative min-h-screen flex items-center justify-center bg-noise">
      <div className="absolute inset-0 bg-grid-subtle opacity-40"></div>
      
      <div className="container mx-auto px-6 relative z-10">
        <div className="max-w-4xl mx-auto text-center space-y-12">

          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.1 }}
            className="space-y-6"
          >
            <h1 className="text-6xl md:text-8xl font-bold tracking-tighter leading-[0.9]">
              Deploy. Fix. Scale.
              <br />
              <span className="text-muted-foreground">Without the Complexity.</span>
            </h1>

            <p className="text-xl md:text-2xl text-muted-foreground max-w-2xl mx-auto leading-relaxed font-light">
              Autonomous AI agent that handles your infrastructure.
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.3 }}
            className="flex justify-center"
          >
            <Link href="/workspace">
              <Button 
                size="lg" 
                className="h-14 px-8 text-base bg-primary text-primary-foreground hover:bg-primary/90 border border-border/20 hover:border-border/40 transition-all duration-200 hover:scale-[1.02] group"
              >
                Start Deployment
                <ArrowRight className="ml-2 w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </Button>
            </Link>
          </motion.div>

        </div>
      </div>
    </section>
  );
}
