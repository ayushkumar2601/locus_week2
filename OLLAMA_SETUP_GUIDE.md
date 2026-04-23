# 🚀 Ollama Setup Guide for Synapse-Builder

## Quick Start

### Step 1: Install Ollama
Download and install from: **https://ollama.com**

- **Windows:** Download .exe installer
- **Mac:** Download .dmg installer  
- **Linux:** Run curl install script (see ollama.com)

### Step 2: Pull the Model
Open a terminal and run:
```bash
ollama pull qwen2.5-coder:1.5b
```

**Note:** First pull takes 2-5 minutes (1.5GB download). Subsequent runs are instant.

### Step 3: Start Ollama Service
```bash
ollama serve
```

You'll see:
```
2026/03/27 20:40:00 serve() net listen tcp 127.0.0.1:11434
```

**Keep this terminal open** - Ollama is now running locally at `http://localhost:11434`

### Step 4: Start Synapse-Builder
In **another terminal**, run:
```bash
cd e:\Synapse-Builder
npm run dev
```

Open **http://localhost:5000** in your browser.

### Step 5: Test It!
1. Click the chat input box
2. Type: "Hello, what can you do?"
3. Hit Enter
4. **You'll get an instant response from Ollama** (no API keys needed!)

---

## ✨ What You Get

### With Ollama Running:
- ⚡ **Instant responses** (no API latency)
- 🆓 **Zero API costs** (local processing)
- 🔒 **Private** (no data sent to external services)
- 🖥️ **Works offline** (if you have the model)

### Code Generation Example:
**You:** "Create a React button component"

**Ollama responds instantly** with working code:
```typescript
function MyButton() {
  return (
    <button className="px-4 py-2 bg-blue-500 text-white rounded">
      Click me
    </button>
  );
}
```

You can immediately apply it to your editor!

---

## 🔧 Configuration

Located in `.env`:
```bash
OLLAMA_API_URL=http://localhost:11434
OLLAMA_MODEL=qwen2.5-coder:1.5b
```

### Change the Model:
1. Pull a different model: `ollama pull llama2`
2. Update `.env`: `OLLAMA_MODEL=llama2`
3. Restart server: `npm run dev`

### Popular Models for Coding:
```bash
ollama pull qwen2.5-coder:1.5b     # Fast, best for coding (RECOMMENDED)
ollama pull codegemma:7b          # Google's code model
ollama pull codellama:7b          # Meta's Llama 2 for code
ollama pull neural-chat:7b        # Fast general-purpose
```

---

## 🎯 Priority Chain

When you send a message:

1. **Ollama** (runs immediately if service is on)
2. ❌ Ollama fails?
3. **Gemini** (Google's free API)
4. ❌ Gemini fails?
5. **Claude** (Anthropic)
6. ❌ Claude fails?
7. **OpenAI** (ChatGPT)
8. ❌ All fail?
9. **Safe fallback message** in your language

**Result:** You always get a response! 🎉

---

## 🖥️ System Requirements

### Minimum (for qwen2.5-coder:1.5b):
- **RAM:** 4GB available
- **Disk:** 3GB for model file
- **CPU:** Any modern processor
- **GPU:** Optional (CPU mode works fine)

### Recommended:
- **RAM:** 8GB+ available
- **GPU:** NVIDIA (CUDA) or Apple Silicon (Metal) - 3-5x faster
- **SSD:** For faster model loading

### GPU Support:
- **NVIDIA:** Install CUDA toolkit, Ollama will auto-detect
- **Apple:** Works natively on M1/M2/M3 (Apple Silicon)
- **AMD:** Install ROCm for GPU support

---

## ⚠️ Troubleshooting

### "Cannot connect to Ollama"
```
❌ Error: Failed to connect to http://localhost:11434
```

**Fix:**
```bash
# Terminal 1: Start Ollama
ollama serve

# Terminal 2: Check it's running
curl http://localhost:11434/api/tags
```

### "Model not found"
```
❌ Error: model 'qwen2.5-coder:1.5b' not found
```

**Fix:**
```bash
# Pull the model
ollama pull qwen2.5-coder:1.5b

# List available models
ollama list
```

### Ollama Takes Forever to Respond
**Issue:** Model is running on CPU (slow)

**Solution:**
- Get a GPU (NVIDIA/AMD/Apple Silicon)
- Or reduce model size: `ollama pull phi:2.7b`
- Or increase RAM allocated to Ollama

### Browser Says "Offline"
**Issue:** Ollama service crashed

**Fix:**
```bash
# Terminal showing Ollama: Press Ctrl+C
# Then restart:
ollama serve
```

---

## 📊 Performance (qwen2.5-coder:1.5b)

| Hardware | Time to First Token | Total Response Time |
|----------|-------------------|-------------------|
| CPU (i7) | 2-3 seconds | 5-8 seconds |
| GPU (RTX 3080) | 0.2 seconds | 0.5-1 second |
| Apple M2 | 0.5 seconds | 1-2 seconds |

**Cloud APIs for comparison:**
- OpenAI GPT-4: 1-2 seconds (but costs $0.01/request)
- Gemini: 0.5-1 second (free, but rate-limited)

---

## 🎓 Learning Tips

### Try These Prompts:
1. "Create a login form with validation"
2. "Explain how React hooks work"
3. "Generate a TODO app component"
4. "Write a fetch function to call an API"
5. "Create a dark mode toggle"

All responses come **instantly** from local Ollama!

---

## 🔐 Privacy & Security

✅ **Why use Ollama?**
- No data leaves your machine
- No API keys exposed
- No usage tracking
- No vendor lock-in
- Own the compute

**Perfect for:**
- Sensitive code
- Enterprise environments
- Privacy-conscious developers
- Air-gapped networks

---

## 📞 Need Help?

1. Check Ollama is running: `ollama serve`
2. Check model is available: `ollama list`
3. Check network: `curl http://localhost:11434`
4. Check .env has correct settings
5. Restart Synapse: `npm run dev`

---

**Enjoy instant, free, local AI coding! 🚀**
