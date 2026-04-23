
import { Link } from "wouter";

export default function Footer() {
  return (
    <footer className="border-t border-border/40 bg-card/30 pt-16 pb-8">
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-8 mb-12">
          <div className="col-span-2 lg:col-span-2">
            <div className="flex items-center gap-2 mb-6">
              <img src="/logo.png" alt="Synapse Studio" className="w-8 h-8 rounded-lg object-cover" />
              <span className="font-display font-bold text-xl tracking-tight">
                Synapse <span className="text-muted-foreground font-normal">Studio</span>
              </span>
            </div>
            <p className="text-muted-foreground text-sm max-w-xs mb-6">
              The intelligent, voice-first website builder for modern creators and developers.
            </p>
            <div className="flex items-center gap-4 text-muted-foreground">
              <a href="https://twitter.com" target="_blank" rel="noreferrer" className="hover:text-foreground transition-colors">Twitter</a>
              <a href="https://github.com" target="_blank" rel="noreferrer" className="hover:text-foreground transition-colors">GitHub</a>
              <a href="https://discord.com" target="_blank" rel="noreferrer" className="hover:text-foreground transition-colors">Discord</a>
            </div>
          </div>

          <div>
            <h4 className="font-semibold mb-4 text-foreground">Product</h4>
            <ul className="space-y-3 text-sm text-muted-foreground">
              <li><Link href="/#features" className="hover:text-primary transition-colors">Features</Link></li>
              <li><Link href="/#pricing" className="hover:text-primary transition-colors">Pricing</Link></li>
              <li><Link href="/dashboard" className="hover:text-primary transition-colors">Changelog</Link></li>
              <li><Link href="/workspace" className="hover:text-primary transition-colors">Documentation</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="font-semibold mb-4 text-foreground">Company</h4>
            <ul className="space-y-3 text-sm text-muted-foreground">
              <li><Link href="/welcome" className="hover:text-primary transition-colors">About</Link></li>
              <li><Link href="/dashboard" className="hover:text-primary transition-colors">Blog</Link></li>
              <li><Link href="/auth" className="hover:text-primary transition-colors">Careers</Link></li>
              <li><Link href="/auth" className="hover:text-primary transition-colors">Contact</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="font-semibold mb-4 text-foreground">Legal</h4>
            <ul className="space-y-3 text-sm text-muted-foreground">
              <li><Link href="/welcome" className="hover:text-primary transition-colors">Privacy Policy</Link></li>
              <li><Link href="/welcome" className="hover:text-primary transition-colors">Terms of Service</Link></li>
              <li><Link href="/welcome" className="hover:text-primary transition-colors">Cookie Policy</Link></li>
            </ul>
          </div>
        </div>

        <div className="pt-8 border-t border-border/40 flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-xs text-muted-foreground">
            © {new Date().getFullYear()} Synapse Studio. All rights reserved.
          </p>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span className="flex h-2 w-2 rounded-full bg-teal-500"></span>
            All systems operational
          </div>
        </div>
      </div>
    </footer>
  );
}
