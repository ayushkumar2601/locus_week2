import { Button } from "@/components/ui/button";
import { Check } from "lucide-react";
import { motion } from "framer-motion";

const tiers = [
  {
    name: "Hobby",
    price: "$0",
    description: "Perfect for exploring the AI builder capabilities.",
    features: [
      "1 Project",
      "Standard AI Models (GPT-3.5)",
      "Community Support",
      "Synapse Subdomain",
      "50 AI Generations / mo"
    ],
    highlight: false,
    cta: "Start Free"
  },
  {
    name: "Pro",
    price: "$29",
    period: "/mo",
    description: "For creators building production-ready sites.",
    features: [
      "Unlimited Projects",
      "Premium AI Models (GPT-4o, Claude 3.5)",
      "Code Export (React/Vite)",
      "Custom Domains",
      "Unlimited AI Generations",
      "Priority Support"
    ],
    highlight: true,
    cta: "Upgrade to Pro"
  },
  {
    name: "Team",
    price: "$99",
    period: "/mo",
    description: "For agencies and teams collaborating on design.",
    features: [
      "Everything in Pro",
      "5 Team Members",
      "Shared Workspaces",
      "Custom Component Library",
      "Version History (90 days)",
      "Dedicated Slack Channel"
    ],
    highlight: false,
    cta: "Contact Sales"
  }
];

export default function Pricing() {
  return (
    <section id="pricing" className="py-24 relative">
      <div className="container mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="text-center max-w-3xl mx-auto mb-16"
        >
          <h2 className="text-3xl md:text-5xl font-bold mb-6">Simple, scalable pricing</h2>
          <p className="text-muted-foreground text-lg">
            Start building for free. Upgrade when you need premium AI models and export capabilities.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto">
          {tiers.map((tier, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.15, duration: 0.5 }}
              whileHover={{ y: -8, scale: 1.02 }}
              className={`relative flex flex-col p-8 rounded-3xl transition-all ${tier.highlight
                ? "bg-gradient-to-b from-primary/15 to-card border-primary/40 shadow-[0_0_40px_rgba(99,144,255,0.12)] border-2 hover:shadow-[0_0_60px_rgba(99,144,255,0.25)]"
                : "glass-panel hover:shadow-xl"
                }`}
            >
              {tier.highlight && (
                <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 px-3 py-1 bg-primary text-primary-foreground text-xs font-bold rounded-full uppercase tracking-wider">
                  MOST POPULAR
                </div>
              )}

              <div className="mb-8">
                <h3 className="text-xl font-semibold mb-2">{tier.name}</h3>
                <div className="flex items-baseline gap-1 mb-3">
                  <span className="text-4xl font-bold">{tier.price}</span>
                  {tier.period && <span className="text-muted-foreground">{tier.period}</span>}
                </div>
                <p className="text-sm text-muted-foreground">{tier.description}</p>
              </div>

              <div className="flex-1 space-y-4 mb-8">
                {tier.features.map((feat, j) => (
                  <div key={j} className="flex items-start gap-3">
                    <Check className={`w-5 h-5 shrink-0 ${tier.highlight ? "text-primary" : "text-muted-foreground"}`} />
                    <span className="text-sm text-foreground/90">{feat}</span>
                  </div>
                ))}
              </div>

              <Button
                variant={tier.highlight ? "default" : "outline"}
                className={`w-full h-12 ${tier.highlight ? "shadow-[0_0_20px_rgba(99,144,255,0.3)]" : "border-border/50"}`}
              >
                {tier.cta}
              </Button>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
