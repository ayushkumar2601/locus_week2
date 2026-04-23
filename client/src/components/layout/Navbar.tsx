import { Button } from "@/components/ui/button";
import { Menu, X } from "lucide-react";
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
      className={`fixed top-0 left-0 w-full z-50 transition-all duration-300 ${
        scrolled
          ? "bg-background/90 backdrop-blur-sm border-b border-primary/20"
          : "bg-transparent border-none"
      }`}
    >
      <div className="container mx-auto px-6 h-16 flex items-center justify-between">
        <Link href="/" className="flex items-center">
          <span className="font-mono text-xl tracking-widest font-bold text-primary">
            FLOCUS
          </span>
        </Link>

        <nav className="hidden md:flex items-center gap-12">
          <Link href="/#modules" className="text-sm font-mono tracking-wider text-muted-foreground hover:text-primary transition-colors uppercase">
            MODULES
          </Link>
          <Link href="/system" className="text-sm font-mono tracking-wider text-muted-foreground hover:text-primary transition-colors uppercase">
            SYSTEM
          </Link>
          <Link href="/workspace" className="text-sm font-mono tracking-wider text-muted-foreground hover:text-primary transition-colors uppercase">
            DEPLOY
          </Link>
        </nav>

        <div className="flex items-center gap-4">
          <ThemeToggle />
          <Link href="/auth">
            <Button variant="ghost" className="hidden sm:inline-flex text-sm font-mono tracking-wider uppercase">
              ACCESS
            </Button>
          </Link>
          <Link href="/workspace">
            <Button className="bg-transparent border border-primary text-primary hover:bg-primary hover:text-primary-foreground transition-all duration-200 font-mono tracking-wider uppercase cyber-glow-hover">
              INITIATE DEPLOYMENT
            </Button>
          </Link>
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden border border-primary/30 hover:border-primary"
            onClick={() => setMobileMenuOpen((prev) => !prev)}
            aria-label="Toggle mobile menu"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </Button>
        </div>
      </div>

      {mobileMenuOpen && (
        <div className="md:hidden border-t border-primary/20 bg-background/95 backdrop-blur-sm">
          <div className="container mx-auto px-6 py-4 flex flex-col gap-4 text-sm font-mono">
            <Link 
              href="/#modules" 
              className="py-2 text-muted-foreground hover:text-primary transition-colors tracking-wider uppercase" 
              onClick={() => setMobileMenuOpen(false)}
            >
              MODULES
            </Link>
            <Link 
              href="/system" 
              className="py-2 text-muted-foreground hover:text-primary transition-colors tracking-wider uppercase" 
              onClick={() => setMobileMenuOpen(false)}
            >
              SYSTEM
            </Link>
            <Link 
              href="/workspace" 
              className="py-2 text-muted-foreground hover:text-primary transition-colors tracking-wider uppercase" 
              onClick={() => setMobileMenuOpen(false)}
            >
              DEPLOY
            </Link>
            <Link 
              href="/auth" 
              className="py-2 text-muted-foreground hover:text-primary transition-colors tracking-wider uppercase" 
              onClick={() => setMobileMenuOpen(false)}
            >
              ACCESS
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}
