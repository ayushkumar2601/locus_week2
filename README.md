# Synapse Studio 🧠✨

Synapse Studio is a next-generation, AI-driven website builder designed for high-velocity frontend development. Describe your vision, and Synapse Studio will generate clean, modular, production-ready React code in real-time, leveraging advanced AI models like Gemini 1.5 Pro.

![Synapse Studio Logo](./client/public/logo.png)

---

## 🚀 Key Features

- **Multi-Provider AI System**: 
  - 🏠 **Local Ollama** (qwen2.5-coder:1.5b) - Instant responses, zero cost, works offline
  - ☁️ **Cloud Fallback** - Gemini, Claude, OpenAI, Groq, Perplexity for redundancy
  - ⚡ **Smart Failover** - Automatically tries Ollama first, falls back to cloud if needed
- **Voice-Enabled Interaction**:
  - 🎤 **Speech Recognition** - Web Speech API with English, Bengali, and Hindi support
  - 🔊 **Text-to-Speech** - Automatic voice output for AI responses
  - 🌍 **Multilingual** - Input and output in multiple languages
- **Production React Code**: Generates pristine, modular React components styled with Tailwind CSS, ready for immediate use.
- **Interactive Workspace**: A sophisticated split-pane environment featuring:
    - **AI Chat Interface**: Real-time interaction with Synapse AI for code generation and iterative improvements.
    - **Integrated Terminal**: Authenticated websocket terminal with node-pty support.
    - **Live Preview**: Instant visual feedback of your components across different device sizes.
    - **Integrated Code Editor**: A full-featured Monaco editor for direct manual code adjustments.
- **Comprehensive Dashboard**: Track your project history, AI generation stats, and manage your profile in a sleek, user-centric dashboard.
- **Figma-like Design Editor**: A robust canvas environment for visual UI creation with layers, toolbars, and property panels for precise control.
- **Secure Authentication**: Built-in authentication flow with a highly animated and engaging user onboarding experience.
- **Professional SaaS UI**: Built with a modern, enterprise-grade dark/light mode interface featuring smooth Framer Motion animations.

---

## 🎨 Frontend Architecture

The frontend is built with a modern React stack, focusing on performance, modularity, and a premium user experience.

### **Core Technologies**
- **Framework**: [React 19](https://react.dev/)
- **Build Tool**: [Vite](https://vitejs.dev/)
- **Styling**: [Tailwind CSS v4](https://tailwindcss.com/)
- **Animations**: [Framer Motion](https://www.framer.com/motion/)
- **Editor**: [Monaco Editor](https://microsoft.github.io/monaco-editor/)
- **UI Components**: [Radix UI](https://www.radix-ui.com/) & [shadcn/ui](https://ui.shadcn.com/)
- **Routing**: [Wouter](https://github.com/molefrog/wouter)
- **Data Fetching**: [TanStack Query](https://tanstack.com/query/latest)

### **Key Directories**
- `client/src/components/ui`: Base UI components built with shadcn/ui.
- `client/src/components/workspace`: The core building interface (Chat, Editor, Preview).
- `client/src/components/design`: The visual design editor canvas.
- `client/src/pages`: Application routes (Home, Auth, Dashboard, Workspace, Design).

---

## ⚙️ Backend Architecture

The backend is a robust Express.js server designed for speed and simplicity, utilizing file-based storage for zero-config deployment.

### **Core Technologies**
- **Server**: [Express.js](https://expressjs.com/)
- **Persistence**: File-based JSON storage (simulating a database for local development).
- **AI Integration**: Direct integration with Google's Gemini API via `fetch`.
- **Authentication**: Bearer token authentication with secure password hashing.
- **Validation**: [Zod](https://zod.dev/) for strict schema validation.

### **Key Modules**
- `server/storage.ts`: Manages data persistence using JSON files in the `data/` directory.
- `server/gemini.ts`: Handles all communication with the Gemini AI model.
- `server/routes.ts`: Defines authentication, chat, dashboard, project, and clone API routes.
- `server/terminal.ts`: Provides authenticated terminal websocket sessions.

---

## 📦 Getting Started

### Prerequisites
- **Node.js**: v20 or higher is recommended.
- **Package Manager**: npm (standard) or your preferred alternative.

### Installation

1. **Clone the repository**:
   ```bash
   git clone https://github.com/yourusername/synapse-builder.git
   cd synapse-builder
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Set up Environment Variables**:
   Create a `.env` file in the root directory.
   ```env
   SESSION_SECRET=change_me_to_a_random_secret

   # Local AI (Ollama) - PRIORITY 1 - Optional but recommended
   OLLAMA_API_URL=http://localhost:11434
   OLLAMA_MODEL=qwen2.5-coder:1.5b

   # Cloud AI Providers - Automatic Fallback
   GEMINI_API_KEY=your_gemini_api_key
   ANTHROPIC_API_KEY=your_claude_key
   OPENAI_API_KEY=your_openai_key
   GROQ_API_KEY=your_groq_key
   PERPLEXITY_API_KEY=your_perplexity_key
   ```

   **Provider Priority**:
   1. **Ollama** (If running locally at localhost:11434)
   2. User-selected provider (if available)
   3. Fallback chain: Gemini → Claude → OpenAI → Groq → Perplexity
   
   The backend automatically tries Ollama first for instant responses, then falls back to cloud providers if needed.

4. **Optional: Set up Ollama for local AI** (Recommended for best performance):
   ```bash
   # Download from https://ollama.com and install
   # Then in a separate terminal:
   ollama serve
   
   # In another terminal, pull the model:
   ollama pull qwen2.5-coder:1.5b
   ```
   
   Benefits of using Ollama:
   - ⚡ **Instant responses** (0.3-3 seconds vs 1-5 seconds for cloud)
   - 🆓 **Zero API costs** (no credits consumed)
   - 🔒 **Private** (code stays on your machine)
   - 🌐 **Works offline** (no internet required)

5. **Start the development server**:
   Synapse Studio uses a unified development environment. Running the command below starts **both** the Express backend and the Vite frontend simultaneously on the same port.
   ```bash
   npm run dev
   ```

   The application (Frontend + API) will be available at `http://localhost:5000`.

---

## 🚀 How it Works (Unified Server)

Unlike traditional setups where you run the frontend and backend separately, Synapse Studio integrates them:

- **Development Mode**: When you run `npm run dev`, the Express server starts and automatically attaches the **Vite middleware**. This means your API and your React app both live on `localhost:5000`, eliminating CORS issues and simplifying development.
- **Production Mode**: In production (`npm start`), the Express server serves the pre-built static files from the `dist/public` folder.

---

## 🎤 Voice Features

Synapse Studio includes comprehensive voice capabilities for hands-free interaction:

### **Speech Recognition (STT)**
- Uses Web Speech API for browser-native voice recognition
- Supports multiple languages: English, Bengali, Hindi
- Real-time interim transcription as you speak
- Automatic silence detection (stops after 1-2 seconds of quiet)
- Auto-send feature: Messages are automatically sent when recording ends (optional)

### **Text-to-Speech (TTS)**
- Enable voice output with the 🔊 button
- AI responses are automatically read aloud
- Language-aware pronunciation (respects your output language setting)
- Toggle on/off anytime without interrupting chat

### **Usage**
1. Click the 🎤 microphone icon to start recording
2. Say something clearly
3. Stop speaking (auto-stops after silence)
4. Message auto-sends or waits for manual send (toggle in settings)
5. Enable 🔊 to hear AI responses

---

## 🤖 AI Provider System

Synapse Studio uses an intelligent, multi-provider AI system for reliability and performance:

### **Provider Priority Chain**
```
User sends message
    ↓
[Ollama] LOCAL - Instant, zero-cost
    ↓ (If running)
[User Selected] Gemini/Claude/GPT/etc
    ↓ (If fails)
[Gemini] Google's AI
    ↓ (If fails)
[Claude] Anthropic's AI
    ↓ (If fails)
[OpenAI] GPT models
    ↓ (If fails)
[Groq] Fast inference
    ↓ (If all fail)
[Safe Fallback] Graceful error message
```

### **Why Ollama First?**
| Provider | Speed | Cost | Privacy | Setup |
|----------|-------|------|---------|-------|
| **Ollama** | ⚡⚡⚡ 0.3-3s | 🆓 FREE | 🔒 Local | 10 min |
| Gemini | ⚡⚡ 1-2s | 🆓 Free tier | 📡 Cloud | API key |
| Claude | ⚡⚡ 1-3s | 💰 Paid | 📡 Cloud | API key |
| OpenAI | ⚡ 1-3s | 💰 Paid | 📡 Cloud | API key |

### **Recommended Setup**
1. Install Ollama for local, instant responses
2. Keep cloud API keys as backup
3. System automatically uses best available provider
4. No configuration needed beyond .env

---

## 🏗️ Project Structure

```text
├── client/               # React frontend application
│   ├── public/           # Static assets (images, logos)
│   └── src/
│       ├── components/   # UI, Layout, Workspace, and Design components
│       │   ├── workspace/
│       │   │   ├── AIChatPanel.tsx    # Voice-enabled AI chat with multilingual support
│       │   │   ├── TerminalPanel.tsx  # Authenticated terminal with WebSocket
│       │   │   └── EditorPanel.tsx    # Monaco editor with code generation
│       │   └── ui/       # shadcn/ui components
│       ├── hooks/        # Custom React hooks
│       ├── lib/          # Utility functions and shared libraries
│       └── pages/        # Application views and routes
├── server/               # Express backend application
│   ├── aiGateway.ts      # Multi-provider AI orchestration (Ollama + Cloud fallback)
│   ├── gemini.ts         # Gemini AI integration logic
│   ├── routes.ts         # API endpoints and server routing
│   ├── storage.ts        # File-based persistence layer
│   ├── terminal.ts       # Authenticated terminal websocket with node-pty
│   └── index.ts          # Express server entry point
├── shared/               # Shared Zod schemas and TypeScript types
├── data/                 # Persistent storage (JSON files)
└── package.json          # Project dependencies and scripts
```

---

## � Troubleshooting

### **Voice Recognition Not Working**
- **Issue**: Microphone not activating
- **Solution**:
  1. Check browser microphone permission (allow in browser settings)
  2. Ensure microphone is plugged in and working
  3. Test microphone with Windows Sound Settings first
  4. Try "Start Recording" again

- **Issue**: "Network error with voice service"
- **Solution**:
  1. This is a known Web Speech API issue (not our server)
  2. Try a different browser (Chrome/Chromium work best)
  3. Ensure you're not using a VPN
  4. The system will auto-retry up to 3 times

### **Ollama Not Connecting**
- **Issue**: "Network error" when using chat
- **Solution**:
  1. Ensure Ollama is running: `ollama serve` in a terminal
  2. Check URL is correct: `http://localhost:11434`
  3. Verify model is pulled: `ollama list` should show qwen2.5-coder:1.5b
  4. If not present, run: `ollama pull qwen2.5-coder:1.5b`
  5. System will auto-fallback to cloud providers if Ollama is unavailable

- **Issue**: Ollama running but slow responses
- **Solution**:
  1. First run is slow while model loads (~5 seconds)
  2. Subsequent requests are 0.3-1 second
  3. Close other applications to free RAM
  4. qwen2.5-coder:1.5b requires ~6GB RAM minimum

### **Cloud Provider Keys Not Working**
- **Issue**: Getting 401 or "Invalid API Key" errors
- **Solution**:
  1. Verify API key is correct in `.env` file (copy/paste carefully)
  2. Check key hasn't expired or been revoked
  3. Ensure key has correct permissions/scopes
  4. Verify environment variable is loaded: restart dev server

### **Build or Server Issues**
- **Issue**: `npm run dev` fails to start
- **Solution**:
  1. Kill any process on port 5000: `netstat -ano | findstr 5000`
  2. Clean install: `rm -r node_modules && npm install`
  3. Check Node.js version: `node -v` (should be v20+)

- **Issue**: TypeScript compilation errors
- **Solution**:
  1. Errors are usually dependency-related
  2. Try: `npm install`
  3. Clear build cache: `rm -r dist`
  4. Restart dev server

### **Terminal Not Responding**
- **Issue**: Terminal appears but doesn't execute commands
- **Solution**:
  1. Check browser console for errors (F12)
  2. Verify server is running (you should see "Server running" message)
  3. Try refreshing the page (Ctrl+R)
  4. Commands run on the **server machine**, not in browser

---

## 🎯 Voice Usage Examples

### **Example 1: Quick Web Component**
```
You: "Create a card component with a title, description, and button"
AI: [Generates React component]
You: 🔊 (Enable voice to hear the code explanation)
```

### **Example 2: Design Interface Walkthrough**
```
You: "Make the card look like a payment card with a dark theme"
AI: [Updates styling]
Computer: [Voice reads the updated code]
```

### **Example 3: Multilingual Interaction**
```
You: (Switch to Bengali) "আমাকে একটি ফর্ম তৈরি করুন"
AI: [Generates form component]
You: 🎤 (Talk in Bengali, AI responds in Bengali)
```

---

## 🌐 Browser Compatibility

| Browser | Voice | Terminal | Status |
|---------|-------|----------|--------|
| Chrome/Chromium | ✅ Full | ✅ Full | Best |
| Firefox | ⚠️ Limited* | ✅ Full | Works |
| Safari | ⚠️ Limited* | ✅ Full | Works |
| Edge | ✅ Full | ✅ Full | Best |

*Limited: Speech Recognition works only in English on some browsers. Use Chrome for multilingual support.

---

## 📚 Advanced Configuration

### **Using Different Ollama Models**
Edit `.env` to use different models:
```env
OLLAMA_MODEL=mistral:latest          # Faster, less capable
OLLAMA_MODEL=llama2:latest           # Strong general model
OLLAMA_MODEL=codellama:latest        # Code-focused
OLLAMA_MODEL=neural-chat:latest      # Best for chat
```

### **Custom Voice Settings**
In `AIChatPanel.tsx`, modify:
```typescript
const recognition = new webkitSpeechRecognition();
recognition.language = 'en-US';      // Change language
recognition.interimResults = true;   // Real-time transcription
recognition.continuous = false;      // Auto-stop on silence
```

### **Provider Customization**
To change provider priority in `server/aiGateway.ts`:
```typescript
// Reorder the fallback chain
const providers = [
  { name: 'ollama', handler: tryOllama },
  { name: 'claude', handler: tryClaude },
  { name: 'gemini', handler: tryGemini },
  // ... etc
];
```

---

## 💡 Tips & Best Practices

1. **Use Ollama for Development**: Zero cost, instant responses, works offline
2. **Keep Cloud Keys as Backup**: Never rely on only one provider
3. **Voice Works Best in English**: Due to browser API limitations, English is most reliable
4. **Save Your Work**: Use the Dashboard to track and save projects
5. **Terminal Commands**: Terminal runs on the server, so paths are absolute
6. **Code Generation**: Be specific in prompts for better results

---

## 📝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

---

## �📄 License

This project is licensed under the MIT License.
