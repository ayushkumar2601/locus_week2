import { useEffect, useRef, useState } from "react";
import Editor from "@monaco-editor/react";
import { X, FileCode, Circle } from "lucide-react";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";

// Mock file contents for different files
export const DEFAULT_FILE_CONTENTS: Record<string, { content: string; language: string }> = {
  "src/App.tsx": {
    language: "typescript",
    content: `import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Home from './pages/Home';
import About from './pages/About';
import Navbar from './components/Navbar';

export default function App() {
  return (
    <BrowserRouter>
      <div className="min-h-screen bg-slate-950 text-white">
        <Navbar />
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/about" element={<About />} />
        </Routes>
      </div>
    </BrowserRouter>
  );
}`,
  },
  "src/components/Hero.tsx": {
    language: "typescript",
    content: `import { motion } from 'framer-motion';
import { ArrowRight, Sparkles } from 'lucide-react';

export default function Hero() {
  return (
    <section className="relative py-32 overflow-hidden">
      <div className="absolute inset-0 bg-linear-to-b from-primary/10 to-transparent" />
      
      <div className="container mx-auto px-4 relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="text-center max-w-4xl mx-auto"
        >
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-primary/30 bg-primary/10 mb-8">
            <Sparkles className="w-4 h-4 text-primary" />
            <span className="text-sm font-medium">Now in Beta</span>
          </div>

          <h1 className="text-6xl md:text-8xl font-bold tracking-tight mb-8">
            Build Faster.
            <br />
            <span className="text-transparent bg-clip-text bg-linear-to-r from-orange-400 to-amber-300">
              Ship Smarter.
            </span>
          </h1>
          
          <p className="text-xl text-muted-foreground mb-12 max-w-2xl mx-auto">
            The next-generation platform for building 
            modern web applications with AI assistance.
          </p>

          <div className="flex items-center justify-center gap-4">
            <button className="px-8 py-4 bg-primary text-white rounded-xl font-semibold hover:bg-primary/90 transition-colors flex items-center gap-2">
              Get Started
              <ArrowRight className="w-5 h-5" />
            </button>
          </div>
        </motion.div>
      </div>
    </section>
  );
}`,
  },
  "src/components/Navbar.tsx": {
    language: "typescript",
    content: `import { useState } from 'react';
import { Menu, X, Sparkles } from 'lucide-react';

export default function Navbar() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 backdrop-blur-xl border-b border-white/10">
      <div className="container mx-auto px-4 h-16 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-primary" />
          <span className="font-bold text-lg">MyApp</span>
        </div>

        <nav className="hidden md:flex items-center gap-8">
          <a href="#" className="text-sm hover:text-primary transition-colors">Features</a>
          <a href="#" className="text-sm hover:text-primary transition-colors">Pricing</a>
          <a href="#" className="text-sm hover:text-primary transition-colors">Docs</a>
        </nav>

        <button className="px-4 py-2 bg-primary rounded-lg text-sm font-medium">
          Sign Up
        </button>
      </div>
    </header>
  );
}`,
  },
  "src/components/Features.tsx": {
    language: "typescript",
    content: `import { Brain, Zap, Shield, Globe, Code, Layers } from 'lucide-react';
import { motion } from 'framer-motion';

const features = [
  {
    icon: Brain,
    title: "AI-Powered",
    description: "Intelligent code generation and suggestions powered by advanced LLMs.",
    color: "text-purple-400",
  },
  {
    icon: Zap,
    title: "Lightning Fast",
    description: "Optimized build pipeline for instant hot reloading.",
    color: "text-yellow-400",
  },
  {
    icon: Shield,
    title: "Secure by Default",
    description: "Enterprise-grade security built into every layer.",
    color: "text-green-400",
  },
  {
    icon: Globe,
    title: "Edge Ready",
    description: "Deploy to the edge in one click with CDN support.",
    color: "text-blue-400",
  },
];

export default function Features() {
  return (
    <section className="py-24 bg-card/30">
      <div className="container mx-auto px-4">
        <h2 className="text-4xl font-bold text-center mb-16">Features</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {features.map((feature, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
              className="p-6 rounded-2xl bg-card border border-border hover:border-primary/30 transition-colors"
            >
              <feature.icon className={\`w-8 h-8 \${feature.color} mb-4\`} />
              <h3 className="text-lg font-semibold mb-2">{feature.title}</h3>
              <p className="text-sm text-muted-foreground">{feature.description}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}`,
  },
  "src/pages/Home.tsx": {
    language: "typescript",
    content: `import Hero from '../components/Hero';
import Features from '../components/Features';

export default function Home() {
  return (
    <main>
      <Hero />
      <Features />
    </main>
  );
}`,
  },
  "src/main.tsx": {
    language: "typescript",
    content: `import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);`,
  },
  "src/index.css": {
    language: "css",
    content: `@import "tailwindcss";

:root {
  --background: 240 10% 4%;
  --foreground: 20 10% 98%;
  --primary: 25 80% 60%;
  --primary-foreground: 210 40% 98%;
  --card: 240 10% 6%;
  --card-foreground: 20 10% 98%;
  --muted: 240 5% 15%;
  --muted-foreground: 240 5% 65%;
  --border: 240 5% 15%;
}

body {
  font-family: 'Inter', sans-serif;
  background: hsl(var(--background));
  color: hsl(var(--foreground));
  margin: 0;
}`,
  },
  "package.json": {
    language: "json",
    content: `{
  "name": "my-project",
  "version": "1.0.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build",
    "preview": "vite preview"
  },
  "dependencies": {
    "react": "^19.0.0",
    "react-dom": "^19.0.0",
    "react-router-dom": "^7.0.0",
    "framer-motion": "^12.0.0",
    "lucide-react": "^0.450.0"
  },
  "devDependencies": {
    "@types/react": "^19.0.0",
    "@vitejs/plugin-react": "^4.3.0",
    "tailwindcss": "^4.0.0",
    "typescript": "^5.6.0",
    "vite": "^6.0.0"
  }
}`,
  },
  "vite.config.ts": {
    language: "typescript",
    content: `import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 3000,
    open: true,
  },
});`,
  },
  "tsconfig.json": {
    language: "json",
    content: `{
  "compilerOptions": {
    "target": "ES2020",
    "module": "ESNext",
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "jsx": "react-jsx",
    "strict": true,
    "moduleResolution": "bundler",
    "baseUrl": ".",
    "paths": {
      "@/*": ["./src/*"]
    }
  },
  "include": ["src"]
}`,
  },
  "README.md": {
    language: "markdown",
    content: `# My Project

A modern web application built with React, TypeScript, and Tailwind CSS.

## Getting Started

\`\`\`bash
npm install
npm run dev
\`\`\`

## Features

- ⚡ Lightning fast with Vite
- 🎨 Beautiful UI with Tailwind CSS
- 🧠 AI-powered development
- 📱 Fully responsive

## License

MIT
`,
  },
};

export interface EditorTab {
  name: string;
  path: string;
  isModified?: boolean;
}

interface EditorPanelProps {
  tabs: EditorTab[];
  activeTab: string | null;
  onTabClick: (path: string) => void;
  onTabClose: (path: string) => void;
  files?: Record<string, { content: string; language: string }>;
  onFileChange?: (path: string, content: string) => void;
  streamToken?: string | null;
  streamTokenSeq?: number;
  streamActive?: boolean;
  streamCommitSeq?: number;
}

export default function EditorPanel({
  tabs,
  activeTab,
  onTabClick,
  onTabClose,
  files,
  onFileChange,
  streamToken,
  streamTokenSeq = 0,
  streamActive = false,
  streamCommitSeq = 0,
}: EditorPanelProps) {
  const resolvedFiles = files ?? DEFAULT_FILE_CONTENTS;
  const activeFile = activeTab ? resolvedFiles[activeTab] : null;
  const editorRef = useRef<any>(null);
  const suppressOnChangeRef = useRef(false);
  const streamDirtyRef = useRef(false);

  const streamInsert = (token: string) => {
    if (!token || !editorRef.current) {
      return;
    }

    const editor = editorRef.current;
    const model = editor.getModel?.();
    if (!model) {
      return;
    }

    const selection = editor.getSelection?.();
    const insertionRange = selection && selection.getEndPosition
      ? {
        startLineNumber: selection.getEndPosition().lineNumber,
        startColumn: selection.getEndPosition().column,
        endLineNumber: selection.getEndPosition().lineNumber,
        endColumn: selection.getEndPosition().column,
      }
      : model.getFullModelRange();

    suppressOnChangeRef.current = true;
    editor.executeEdits("ai-stream", [
      {
        range: insertionRange,
        text: token,
        forceMoveMarkers: true,
      },
    ]);
    editor.pushUndoStop();
    streamDirtyRef.current = true;
    suppressOnChangeRef.current = false;
  };

  if (tabs.length === 0) {
    return (
      <div className="h-full flex flex-col items-center justify-center bg-[hsl(240,10%,4%)] text-muted-foreground">
        <FileCode className="w-16 h-16 mb-4 opacity-20" />
        <p className="text-lg font-medium opacity-40">No file open</p>
        <p className="text-sm opacity-30 mt-1">Select a file from the explorer to start editing</p>
      </div>
    );
  }

  useEffect(() => {
    if (!streamActive || !streamToken || !activeTab || !editorRef.current) {
      return;
    }

    streamInsert(streamToken);
  }, [streamActive, streamToken, streamTokenSeq, activeTab]);

  useEffect(() => {
    if (streamCommitSeq === 0 || !activeTab || !editorRef.current || !streamDirtyRef.current || !onFileChange) {
      return;
    }

    const model = editorRef.current.getModel?.();
    if (!model) {
      return;
    }

    onFileChange(activeTab, model.getValue());
    streamDirtyRef.current = false;
  }, [streamCommitSeq, activeTab, onFileChange]);

  return (
    <div className="h-full flex flex-col bg-[hsl(240,10%,4%)]">
      {/* Tab Bar */}
      <div className="border-b border-[hsl(240,5%,12%)] bg-[hsl(240,10%,5%)]">
        <ScrollArea className="w-full">
          <div className="flex">
            {tabs.map((tab) => (
              <button
                key={tab.path}
                onClick={() => onTabClick(tab.path)}
                className={`group relative flex items-center gap-2 px-4 py-2 text-[13px] border-r border-[hsl(240,5%,12%)] transition-colors shrink-0 ${activeTab === tab.path
                  ? "bg-[hsl(240,10%,4%)] text-foreground"
                  : "bg-[hsl(240,10%,6%)] text-muted-foreground hover:text-foreground"
                  }`}
              >
                {/* Active indicator */}
                {activeTab === tab.path && (
                  <div className="absolute top-0 left-0 right-0 h-0.5 bg-primary" />
                )}
                <FileCode className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                <span className="truncate max-w-30">{tab.name}</span>
                {tab.isModified && (
                  <Circle className="w-2 h-2 fill-primary text-primary shrink-0" />
                )}
                <span
                  role="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onTabClose(tab.path);
                  }}
                  className="p-0.5 rounded hover:bg-[hsl(240,5%,15%)] opacity-0 group-hover:opacity-100 transition-opacity shrink-0 cursor-pointer"
                >
                  <X className="w-3 h-3" />
                </span>
              </button>
            ))}
          </div>
          <ScrollBar orientation="horizontal" />
        </ScrollArea>
      </div>

      {/* Editor */}
      <div className="flex-1 relative">
        {streamActive && (
          <div className="absolute left-0 top-0 bottom-0 z-10 flex items-start pointer-events-none">
            <div className="h-full w-1 bg-primary/70" />
            <div className="mt-2 ml-2 rounded bg-primary/20 px-2 py-1 text-[10px] text-primary font-medium">
              writing...
            </div>
          </div>
        )}
        {activeFile && (
          <Editor
            height="100%"
            language={activeFile.language === "typescript" ? "typescript" : activeFile.language}
            theme="vs-dark"
            value={activeFile.content}
            onMount={(editor) => {
              editorRef.current = editor;
            }}
            onChange={(value) => {
              if (suppressOnChangeRef.current || !activeTab || typeof value !== "string" || !onFileChange) {
                return;
              }

              onFileChange(activeTab, value);
            }}
            options={{
              minimap: { enabled: true, scale: 1, showSlider: "mouseover" },
              fontSize: 13,
              fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
              lineHeight: 1.7,
              padding: { top: 12 },
              scrollBeyondLastLine: false,
              smoothScrolling: true,
              cursorBlinking: "smooth",
              cursorSmoothCaretAnimation: "on",
              renderLineHighlight: "all",
              bracketPairColorization: { enabled: true },
              guides: { bracketPairs: true, indentation: true },
              wordWrap: "on",
              formatOnPaste: true,
              suggestOnTriggerCharacters: true,
              scrollbar: {
                verticalScrollbarSize: 10,
                horizontalScrollbarSize: 10,
              },
            }}
          />
        )}
      </div>
    </div>
  );
}
