import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";
import { Link } from "wouter";

export default function FinalCTA() {
  return (
    <section className="py-32 relative">
      <div className="container mx-auto px-6">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          viewport={{ once: true }}
          className="max-w-2xl mx-auto text-center space-y-8"
        >
          <h2 className="text-3xl md:text-5xl font-bold tracking-tighter">
            Ready to simplify deployment?
          </h2>
          
          <Link href="/workspace">
            <Button 
              size="lg" 
              className="h-14 px-8 text-base bg-primary text-primary-foreground hover:bg-primary/90 border border-border/20 hover:border-border/40 transition-all duration-200 hover:scale-[1.02] group"
            >
              Launch Flocus
              <ArrowRight className="ml-2 w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </Button>
          </Link>
        </motion.div>
      </div>
    </section>
  );
}