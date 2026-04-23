import { Button } from "@/components/ui/button";
import { Menu } from "lucide-react";
import { Link } from "wouter";
import ThemeToggle from "@/components/ui/ThemeToggle";
import { useState, useEffect } from "react";

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    if (!mobileMenuOpen) {
      return;
    }

    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setMobileMenuOpen(false);
      }
    };

    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [mobileMenuOpen]);

  return (
    <header
      className={`fixed top-0 left-0 w-full z-50 transition-all duration-300 ${scrolled
          ? "bg-background/80 backdrop-blur-md border-b border-border/30 shadow-sm py-2"
          : "bg-transparent border-none py-4"
        }`}
    >
      <div className="container mx-auto px-4 h-14 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <img src="/logo.png" alt="Synapse Studio" className="w-8 h-8 rounded-lg object-cover" />
          <span className="font-display font-bold text-xl tracking-tight">
            Synapse <span className="text-muted-foreground font-normal">Studio</span>
          </span>
        </div>

        <nav className="hidden md:flex items-center gap-8">
          <Link href="/#features" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">Features</Link>
          <Link href="/workspace" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">Start Building</Link>
          <Link href="/#pricing" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">Pricing</Link>
          <Link href="/design" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">Design</Link>
        </nav>

        <div className="flex items-center gap-4">
          <ThemeToggle />
          <Link href="/auth">
            <Button variant="ghost" className="hidden sm:inline-flex">Sign In</Button>
          </Link>
          <Link href="/workspace">
            <Button className="bg-primary text-primary-foreground hover:bg-primary/90 shadow-[0_0_20px_rgba(99,144,255,0.3)]">
              Start Building
            </Button>
          </Link>
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden"
            onClick={() => setMobileMenuOpen((prev) => !prev)}
            aria-label="Toggle mobile menu"
          >
            <Menu className="w-5 h-5" />
          </Button>
        </div>
      </div>

      {mobileMenuOpen && (
        <div className="md:hidden border-t border-border/30 bg-background/95 backdrop-blur-md">
          <div className="container mx-auto px-4 py-3 flex flex-col gap-2 text-sm">
            <Link href="/#features" className="py-1.5 text-muted-foreground hover:text-foreground" onClick={() => setMobileMenuOpen(false)}>Features</Link>
            <Link href="/#pricing" className="py-1.5 text-muted-foreground hover:text-foreground" onClick={() => setMobileMenuOpen(false)}>Pricing</Link>
            <Link href="/design" className="py-1.5 text-muted-foreground hover:text-foreground" onClick={() => setMobileMenuOpen(false)}>Design</Link>
            <Link href="/workspace" className="py-1.5 text-muted-foreground hover:text-foreground" onClick={() => setMobileMenuOpen(false)}>Start Building</Link>
            <Link href="/auth" className="py-1.5 text-muted-foreground hover:text-foreground" onClick={() => setMobileMenuOpen(false)}>Sign In</Link>
          </div>
        </div>
      )}
    </header>
  );
}
