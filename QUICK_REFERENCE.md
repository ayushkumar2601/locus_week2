# 🎯 QUICK REFERENCE CARD

## ⚡ One-Minute Setup

```bash
# Terminal 1: Start Ollama (optional)
ollama serve

# Terminal 2: Start Synapse
cd e:\Synapse-Builder
npm run dev

# Browser: Open
http://localhost:5000
```

## 🎤 Voice Commands

| Action | How |
|--------|-----|
| **Start Recording** | Click 🎤 icon |
| **Stop Recording** | Auto-stops after 1s silence |
| **Enable Voice Output** | Click 🔊 icon |
| **Switch Language** | Click EN / বাং button |
| **Clear Chat** | Click ↻ button |

## 🤖 AI Providers (Auto-Fallback)

1. **🏠 Ollama** (Local, no API key) ← FASTEST
2. **🌐 User Selected** (Claude/GPT/etc)
3. **🔴 Gemini** (Google)
4. **🟠 Claude** (Anthropic)  
5. **🟡 GPT** (OpenAI)
6. **🟢 Groq** (Llama)
7. **🔵 Perplexity** (Search)

## 📝 Useful Prompts

```
"Create a React button component"
"Explain how useState works"
"Write a fetch function to call /api/users"
"Create a login form with validation"
"Generate a TODO app"
```

## 🔧 Troubleshooting

| Problem | Fix |
|---------|-----|
| Voice fails | Browser → Settings → Microphone: Allow |
| No AI response | Check internet + .env API keys |
| Ollama "Cannot connect" | Run `ollama serve` |
| Server "Address in use" | Restart: `npm run dev` |
| Model "Not found" | Run `ollama pull qwen2.5-coder:1.5b` |

## 🔑 Important Env Vars

```bash
# .env file (in project root)
OLLAMA_API_URL=http://localhost:11434
OLLAMA_MODEL=qwen2.5-coder:1.5b
GEMINI_API_KEY=AIzaSy...
ANTHROPIC_API_KEY=sk-ant...
```

## 📊 Performance Tips

| Want... | Do This |
|---------|---------|
| **Faster responses** | Install Ollama + run `ollama serve` |
| **Better code** | Use "Claude" model instead of "Gemini" |
| **Offline mode** | Run Ollama locally |
| **Save money** | Use Ollama (free) |
| **Latest features** | Use Gemini or GPT |

## 🆘 Common Errors

### "Voice capture failed"
```
→ Click browser settings wheel
→ Privacy and security → Camera/Microphone
→ Set to "Allow"
→ Reload page
```

### "Cannot connect to Ollama"
```
→ Open Terminal
→ Run: ollama serve
→ Keep terminal open
→ Synapse will auto-detect
```

### "GEMINI_API_KEY missing"
```
→ Open .env file
→ Check API keys exist
→ Check no spaces/typos
→ Restart: npm run dev
```

## 📱 Browser Support

| Browser | Voice | AI | Chat |
|---------|-------|----|----|
| Chrome | ✅ | ✅ | ✅ |
| Edge | ✅ | ✅ | ✅ |
| Firefox | ❌ | ✅ | ✅ |
| Safari | ✅ | ✅ | ✅ |
| Opera | ❌ | ✅ | ✅ |

## 🎓 How It Works

```
Speak → Browser captures audio → AI responds → Voice reads reply
```

1. Click 🎤 microphone
2. Say something  
3. AI responds (from Ollama OR cloud)
4. If voice enabled: reads response aloud
5. Code applied to editor if requested

## 💡 Pro Tips

- 🎯 **Most Popular:** Claude 3.5 Sonnet (best quality)
- ⚡ **Fastest:** Ollama local (instant)
- 🆓 **Cheapest:** Ollama (free)
- 🔒 **Most Private:** Ollama (stays local)
- 📚 **Best Search:** Perplexity (with web access)

## 🚀 Keyboard Shortcuts

| Key | Action |
|-----|--------|
| Enter | Send message |
| Shift+Enter | New line in input |
| Ctrl+C (to terminal) | Stop server |
| Ctrl+Shift+I | Browser DevTools (debug) |

## 📞 Quick Help

**Something broken?**
1. Check browser console: `Ctrl+Shift+I` → Console tab
2. Check terminal errors: Look at `npm run dev` output
3. Restart everything:
   ```bash
   # Terminal where npm is running
   Ctrl+C
   
   # Now restart
   npm run dev
   ```

**Ollama issues?**
1. Keep Ollama terminal open: `ollama serve`
2. Verify model: `ollama list`
3. Pull model: `ollama pull qwen2.5-coder:1.5b`

---

**Everything Working? 🎉 Now build something awesome!**
