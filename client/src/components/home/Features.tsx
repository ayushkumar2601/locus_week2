import { motion } from "framer-motion";

const features = [
  {
    title: "Autonomous Deployment",
    description: "AI handles the entire deployment pipeline automatically.",
  },
  {
    title: "Self-Healing Systems",
    description: "Detects and fixes infrastructure issues in real-time.",
  },
  {
    title: "Real-Time Monitoring",
    description: "Complete visibility into your infrastructure health.",
  },
  {
    title: "AI Decision Engine",
    description: "Intelligent scaling and optimization decisions.",
  },
];

export default function Features() {
  return (
    <section className="py-32 relative">
      <div className="container mx-auto px-6">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          viewport={{ once: true }}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8"
        >
          {features.map((feature, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: i * 0.1 }}
              viewport={{ once: true }}
              className="text-center space-y-4"
            >
              <h3 className="text-xl font-bold tracking-tight">{feature.title}</h3>
              <p className="text-muted-foreground text-sm leading-relaxed">
                {feature.description}
              </p>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
