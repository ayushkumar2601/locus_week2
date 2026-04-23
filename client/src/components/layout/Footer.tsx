
import { Link } from "wouter";

export default function Footer() {
  return (
    <footer className="border-t border-primary/20 pt-16 pb-8 relative">
      <div className="absolute inset-0 bg-gradient-to-t from-primary/5 via-transparent to-transparent"></div>
      
      <div className="container mx-auto px-6 relative z-10">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-12 mb-12">
          
          {/* Brand Section */}
          <div className="md:col-span-2">
            <Link href="/" className="inline-block mb-6">
              <span className="font-mono text-2xl font-black tracking-widest text-primary uppercase">
                FLOCUS
              </span>
            </Link>
            <p className="text-muted-foreground text-sm font-mono max-w-md mb-6 leading-relaxed">
              // AUTONOMOUS AI INFRASTRUCTURE CONTROL SYSTEM
              <br />
              // DEPLOY. MONITOR. SCALE. REPEAT.
            </p>
            
            {/* System Status */}
            <div className="cyber-border p-4 terminal-bg inline-block">
              <div className="flex items-center gap-3 text-xs font-mono tracking-wider">
                <div className="w-2 h-2 bg-primary pulse-cyber"></div>
                <span className="text-primary">ALL SYSTEMS OPERATIONAL</span>
              </div>
            </div>
          </div>

          {/* Navigation Links */}
          <div>
            <h4 className="font-mono text-sm font-bold mb-6 text-primary tracking-widest uppercase">
              // MODULES
            </h4>
            <ul className="space-y-4 text-xs font-mono text-muted-foreground tracking-wider">
              <li>
                <Link href="/#modules" className="hover:text-primary transition-colors uppercase">
                  SYSTEM MODULES
                </Link>
              </li>
              <li>
                <Link href="/docs" className="hover:text-primary transition-colors uppercase">
                  DOCUMENTATION
                </Link>
              </li>
              <li>
                <Link href="/workspace" className="hover:text-primary transition-colors uppercase">
                  DEPLOY
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="font-mono text-sm font-bold mb-6 text-primary tracking-widest uppercase">
              // ACCESS
            </h4>
            <ul className="space-y-4 text-xs font-mono text-muted-foreground tracking-wider">
              <li>
                <Link href="/auth" className="hover:text-primary transition-colors uppercase">
                  AUTHORIZATION
                </Link>
              </li>
              <li>
                <Link href="/admin" className="hover:text-primary transition-colors uppercase">
                  ADMIN PANEL
                </Link>
              </li>
              <li>
                <Link href="/brain" className="hover:text-primary transition-colors uppercase">
                  BRAIN INTERFACE
                </Link>
              </li>
            </ul>
          </div>
        </div>

        {/* Footer Bottom */}
        <div className="pt-8 border-t border-primary/20 flex flex-col md:flex-row items-center justify-between gap-6">
          
          {/* Copyright */}
          <div className="text-xs font-mono text-muted-foreground tracking-wider">
            <div>© {new Date().getFullYear()} FLOCUS CONTROL SYSTEMS</div>
            <div>// CLASSIFIED INFRASTRUCTURE PROTOCOL</div>
          </div>
          
          {/* System Info */}
          <div className="flex items-center gap-8 text-xs font-mono text-muted-foreground tracking-wider">
            <div className="flex items-center gap-2">
              <div className="w-1 h-1 bg-primary pulse-cyber"></div>
              <span>NODE_STATUS: ACTIVE</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-1 h-1 bg-primary flicker"></div>
              <span>UPTIME: 99.9%</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-1 h-1 bg-primary"></div>
              <span>SYNC: {new Date().toLocaleTimeString()}</span>
            </div>
          </div>
        </div>

        {/* Version Info */}
        <div className="mt-6 pt-4 border-t border-primary/10 text-center">
          <div className="text-xs font-mono text-muted-foreground/60 tracking-wider">
            // FLOCUS v2.1.0 | BUILD: {Date.now().toString(36).toUpperCase()}
          </div>
        </div>
      </div>
    </footer>
  );
}
