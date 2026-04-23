import { motion } from "framer-motion";

export default function ValueSection() {
  return (
    <section className="py-32 relative">
      <div className="container mx-auto px-6">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          viewport={{ once: true }}
          className="max-w-3xl mx-auto text-center"
        >
          <h2 className="text-4xl md:text-6xl font-bold tracking-tighter leading-tight mb-8">
            Automate infrastructure.
            <br />
            <span className="text-muted-foreground">Eliminate DevOps overhead.</span>
          </h2>
        </motion.div>
      </div>
    </section>
  );
}