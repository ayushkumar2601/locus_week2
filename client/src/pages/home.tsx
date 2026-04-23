import Navbar from "@/components/layout/Navbar";
import Hero from "@/components/home/Hero";
import Features from "@/components/home/Features";
import Pricing from "@/components/home/Pricing";
import Footer from "@/components/layout/Footer";

export default function Home() {
  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col relative overflow-hidden">
      {/* Background ambient effects */}
      <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-blue-500/15 rounded-full blur-[120px] pointer-events-none opacity-50"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-violet-500/15 rounded-full blur-[120px] pointer-events-none opacity-50"></div>

      <Navbar />

      <main className="flex-1 z-10">
        <Hero />
        <Features />
        <Pricing />
      </main>

      <Footer />
    </div>
  );
}
