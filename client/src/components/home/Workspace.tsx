import { useState } from "react";
import Editor from "@monaco-editor/react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Mic, Terminal, Maximize2, Monitor, Smartphone, Sparkles, Send, Zap, Loader2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const mockCode = `import { useState } from 'react';
import { motion } from 'framer-motion';

export default function PricingHero() {
  return (
    <section className="py-24 px-6 bg-slate-900 text-white overflow-hidden">
      <div className="max-w-4xl mx-auto text-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="inline-block px-4 py-1.5 rounded-full bg-blue-500/10 text-blue-400 font-medium text-sm mb-6 border border-blue-500/20"
        >
          Special Launch Offer
        </motion.div>
        
        <h1 className="text-5xl md:text-7xl font-bold tracking-tight mb-8">
          Simple pricing.
          <br/>
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-violet-500">
            Infinite potential.
          </span>
        </h1>
      </div>
    </section>
  );
}`;

export default function Workspace() {
  const [device, setDevice] = useState<"desktop" | "mobile">("desktop");
  const [isAiThinking, setIsAiThinking] = useState(false);

  const triggerAi = () => {
    setIsAiThinking(true);
    setTimeout(() => setIsAiThinking(false), 2000);
  };

  return (
    <section id="workspace" className="py-20 container mx-auto px-4">
      <div className="mb-12 text-center">
        <h2 className="text-3xl md:text-5xl font-bold mb-4">Intelligent Workspace</h2>
        <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
          Where your voice meets our neural engine. Build, preview, and refine in real-time.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 h-[800px] max-h-[80vh]">

        {/* LEFT PANEL: AI Chat & Voice */}
        <div className="col-span-1 lg:col-span-3 glass-panel rounded-2xl border border-border/50 flex flex-col overflow-hidden relative shadow-2xl shadow-primary/5">
          <div className="p-4 border-b border-border/50 flex items-center justify-between bg-card/40">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-primary" />
              <span className="font-semibold text-sm">Synapse AI</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="flex h-2 w-2 rounded-full bg-blue-500 live-ai-pulse"></span>
              <span className="text-xs text-muted-foreground font-medium">Live Mode</span>
            </div>
          </div>

          <ScrollArea className="flex-1 p-4">
            <div className="space-y-6">
              <div className="bg-accent/50 p-3 rounded-lg rounded-tl-none text-sm text-foreground/90 border border-border/50">
                Hi! I'm ready to build. What are we creating today?
              </div>
              <div className="bg-primary/20 p-3 rounded-lg rounded-tr-none text-sm text-foreground/90 border border-primary/30 ml-auto w-[85%]">
                Create a dark mode hero section for a SaaS pricing page with a blue gradient.
              </div>

              <AnimatePresence>
                {isAiThinking && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="flex flex-col gap-2"
                  >
                    <div className="bg-accent/30 p-3 rounded-lg rounded-tl-none border border-border/50 text-xs flex items-center gap-3">
                      <Loader2 className="w-4 h-4 animate-spin text-primary" />
                      <div className="space-y-1 flex-1">
                        <p className="text-foreground/80 font-medium">Generating Component...</p>
                        <div className="h-1 w-full bg-card rounded-full overflow-hidden">
                          <div className="h-full bg-primary w-2/3 rounded-full animate-pulse"></div>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </ScrollArea>

          <div className="p-4 bg-card/40 border-t border-border/50">
            <div className="relative">
              <input
                type="text"
                placeholder="Describe your component..."
                className="w-full bg-background border border-border rounded-xl pl-10 pr-12 py-3 text-sm focus:outline-none focus:ring-1 focus:ring-primary transition-shadow"
              />
              <Mic className="absolute left-3 top-3.5 w-4 h-4 text-muted-foreground cursor-pointer hover:text-primary transition-colors" />
              <button
                onClick={triggerAi}
                className="absolute right-2 top-2 p-1.5 bg-primary/20 hover:bg-primary/40 text-primary rounded-lg transition-colors"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* CENTER PANEL: Live Preview */}
        <div className="col-span-1 lg:col-span-5 glass-panel rounded-2xl border border-border/50 flex flex-col overflow-hidden shadow-xl">
          <div className="p-3 border-b border-border/50 flex items-center justify-between bg-card/40">
            <div className="flex items-center gap-4">
              <Tabs defaultValue="preview" className="w-[200px]">
                <TabsList className="h-8 bg-background border border-border/50">
                  <TabsTrigger value="preview" className="text-xs data-[state=active]:bg-accent">Preview</TabsTrigger>
                  <TabsTrigger value="console" className="text-xs data-[state=active]:bg-accent">Console</TabsTrigger>
                </TabsList>
              </Tabs>
            </div>
            <div className="flex items-center gap-2 bg-background border border-border/50 rounded-lg p-1">
              <button
                onClick={() => setDevice("desktop")}
                className={`p-1.5 rounded-md transition-colors ${device === "desktop" ? "bg-accent text-foreground" : "text-muted-foreground hover:text-foreground"}`}
              >
                <Monitor className="w-4 h-4" />
              </button>
              <button
                onClick={() => setDevice("mobile")}
                className={`p-1.5 rounded-md transition-colors ${device === "mobile" ? "bg-accent text-foreground" : "text-muted-foreground hover:text-foreground"}`}
              >
                <Smartphone className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div className="flex-1 bg-[url('/grid-bg.svg')] bg-center bg-repeat relative overflow-hidden flex items-center justify-center p-4">
            {/* The actual preview window simulating a browser */}
            <motion.div
              layout
              className={`${device === "desktop" ? "w-full h-full" : "w-[375px] h-[667px]"} bg-slate-900 border border-border shadow-2xl rounded-lg overflow-hidden transition-all duration-300 ease-in-out`}
            >
              {/* This is a visual mockup of the code on the right */}
              <div className="w-full h-full flex items-center justify-center p-8 text-center relative">
                <div className="absolute top-4 right-4 bg-black/50 backdrop-blur-md border border-white/10 text-white text-[10px] px-2 py-1 rounded-md flex items-center gap-1.5 z-10">
                  <Zap className="w-3 h-3 text-blue-400" />
                  Score: 100
                </div>

                <div>
                  <div className="inline-block px-4 py-1.5 rounded-full bg-blue-500/10 text-blue-400 font-medium text-sm mb-6 border border-blue-500/20 shadow-[0_0_15px_rgba(99,144,255,0.15)]">
                    Special Launch Offer
                  </div>
                  <h1 className="text-4xl md:text-6xl font-bold tracking-tight mb-8 text-white">
                    Simple pricing.
                    <br />
                    <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-violet-500">
                      Infinite potential.
                    </span>
                  </h1>
                </div>
              </div>
            </motion.div>
          </div>
        </div>

        {/* RIGHT PANEL: Monaco Editor */}
        <div className="col-span-1 lg:col-span-4 glass-panel rounded-2xl border border-border/50 flex flex-col overflow-hidden shadow-xl">
          <div className="p-3 border-b border-border/50 flex items-center justify-between bg-card/40">
            <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <Terminal className="w-4 h-4" />
              <span>PricingHero.tsx</span>
            </div>
            <div className="flex items-center gap-3 text-xs">
              <span className="text-blue-400 flex items-center gap-1">
                <Zap className="w-3 h-3" /> Optimized
              </span>
              <button className="text-muted-foreground hover:text-foreground">
                <Maximize2 className="w-4 h-4" />
              </button>
            </div>
          </div>
          <div className="flex-1 bg-[#0d1117] p-2 relative">
            {/* Overlay a subtle gradient to make it feel integrated */}
            <div className="absolute inset-0 pointer-events-none shadow-[inset_0_0_30px_rgba(0,0,0,0.5)] z-10"></div>
            <Editor
              height="100%"
              defaultLanguage="typescript"
              theme="vs-dark"
              value={mockCode}
              options={{
                minimap: { enabled: false },
                fontSize: 13,
                fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
                lineHeight: 1.6,
                padding: { top: 16 },
                scrollBeyondLastLine: false,
                smoothScrolling: true,
                cursorBlinking: "smooth",
                renderLineHighlight: "all",
                contextmenu: false,
              }}
            />
          </div>
        </div>

      </div>
    </section>
  );
}
