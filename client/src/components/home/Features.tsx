import { Brain, Code, Rocket, Smartphone, ShieldCheck, Globe } from "lucide-react";

const features = [
  {
    title: "Multi-AI Routing",
    description: "Automatically routes tasks to the most capable LLM—Claude 3.5 for UI, GPT-4o for complex logic, and Gemini for reasoning.",
    icon: <Brain className="w-6 h-6 text-blue-400" />,
  },
  {
    title: "Production React Code",
    description: "No messy proprietary blocks. Get clean, modular React components styled with Tailwind CSS, ready for deployment.",
    icon: <Code className="w-6 h-6 text-cyan-400" />,
  },
  {
    title: "Voice-to-Component",
    description: "Describe what you want visually, and watch it compile in real-time. Built specifically for high-velocity creation.",
    icon: <Rocket className="w-6 h-6 text-violet-400" />,
  },
  {
    title: "Instant Responsiveness",
    description: "Every component is generated mobile-first. Tweak device views in the dashboard without writing media queries.",
    icon: <Smartphone className="w-6 h-6 text-sky-400" />,
  },
  {
    title: "Enterprise Security",
    description: "Your code is isolated. Synapse integrates with standard CI/CD pipelines keeping your proprietary logic secure.",
    icon: <ShieldCheck className="w-6 h-6 text-emerald-400" />,
  },
  {
    title: "Global CDN Deployment",
    description: "Push to edge in one click. PWA enabled by default, ensuring fast load times across every region.",
    icon: <Globe className="w-6 h-6 text-indigo-400" />,
  },
];

export default function Features() {
  return (
    <section id="features" className="py-24 relative bg-card/20">
      <div className="container mx-auto px-4">
        <div className="max-w-3xl mx-auto text-center mb-16">
          <h2 className="text-3xl md:text-5xl font-bold mb-6">Engineered for Scale</h2>
          <p className="text-muted-foreground text-lg">
            Synapse isn't just a site builder. It's a complete intelligent frontend pipeline
            that understands design systems and component architecture.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((feature, i) => (
            <div
              key={i}
              className="glass-panel p-8 rounded-2xl hover:-translate-y-1 transition-all duration-300 group"
            >
              <div className="w-12 h-12 rounded-xl bg-accent flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                {feature.icon}
              </div>
              <h3 className="text-xl font-semibold mb-3">{feature.title}</h3>
              <p className="text-muted-foreground text-sm leading-relaxed">
                {feature.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
