import Navbar from "@/components/layout/Navbar";
import Hero from "@/components/home/Hero";
import Features from "@/components/home/Features";
import DashboardPreview from "@/components/home/DashboardPreview";
import ValueSection from "@/components/home/ValueSection";
import FinalCTA from "@/components/home/FinalCTA";
import Footer from "@/components/layout/Footer";

export default function Home() {
  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <Navbar />

      <main className="flex-1">
        <Hero />
        <Features />
        <DashboardPreview />
        <ValueSection />
        <FinalCTA />
      </main>

      <Footer />
    </div>
  );
}
