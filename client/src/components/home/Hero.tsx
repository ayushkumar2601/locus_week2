import { Button } from "@/components/ui/button";
import { ArrowRight, Mic, Code2, Cpu } from "lucide-react";
import { motion } from "framer-motion";
import { Link } from "wouter";

export default function Hero() {
  return (
    <section className="relative min-h-screen flex items-center pt-24 pb-20 md:pt-32 md:pb-32 overflow-hidden">
      <div className="absolute inset-0 bg-cover bg-center opacity-40 mix-blend-screen" style={{ backgroundImage: "url('/hero-bg.jpg')" }}></div>
      <div className="absolute inset-0 bg-gradient-to-b from-background/0 via-background/20 to-background"></div>

      <div className="container mx-auto px-4 relative z-10">
        <div className="max-w-4xl mx-auto text-center space-y-8">

          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="text-5xl md:text-7xl font-bold tracking-tight leading-[1.1]"
          >
            Speak Your Ideas. <br />
            <span className="text-gradient-primary">Watch Them Compile.</span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed"
          >
            The world's first voice-native, multi-AI powered website builder.
            Generate production-ready React code instantly. Designed for speed, built for scale.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4"
          >
            <Link href="/workspace">
              <Button size="lg" className="w-full sm:w-auto h-14 px-8 text-base bg-primary text-white hover:bg-primary/90 shadow-[0_0_40px_rgba(99,144,255,0.25)] group">
                Start Free Project
                <ArrowRight className="ml-2 w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </Button>
            </Link>
            <Link href="/workspace?voice=1">
              <Button size="lg" variant="outline" className="w-full sm:w-auto h-14 px-8 text-base border-border bg-card/50 hover:bg-accent backdrop-blur-sm">
                <Mic className="mr-2 w-4 h-4 text-primary" />
                Try Voice Builder
              </Button>
            </Link>
          </motion.div>

        </div>
      </div>
    </section>
  );
}
