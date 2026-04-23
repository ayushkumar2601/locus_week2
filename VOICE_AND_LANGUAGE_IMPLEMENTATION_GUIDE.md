# Voice-to-Text & Multilingual Support Implementation Guide

**Source Project**: Synapse Studio  
**Date**: March 27, 2026

This document outlines all files and code using voice-to-text (speech recognition) and multilingual support (Bengali, Hindi capability) in the Synapse Studio project. Use this as a reference to implement similar functionality in another project.

---

## 📋 Summary

### Voice-to-Text Features
- **Web Speech API Integration**: Browser-native speech recognition
- **Real-time Transcription**: Interim and final transcript capture
- **Voice Output**: Text-to-speech with language support
- **Auto-send Capability**: Automatically send messages when recording ends
- **Language Selection**: Dropdown for voice input language
- **Microphone Permission**: Graceful handling of microphone access

### Multilingual Support
- **Output Languages**: English (en) and Bengali (bn)
- **Backend Support**: AI responses in selected language
- **Serbian Font**: Google Fonts integration for Bengali text
- **UI Language**: Interface language selection
- **Storage**: LocalStorage for persistent language preferences

---

## 🔧 Frontend Files

### 1. **[AIChatPanel.tsx](client/src/components/workspace/AIChatPanel.tsx)** ⭐ MAIN FILE
**Purpose**: Complete voice-to-text and language implementation

**Key Implementations**:
- **Web Speech API Setup** (Lines ~1090-1200)
  ```tsx
  const RecognitionCtor = speechWindow.SpeechRecognition || 
                         speechWindow.webkitSpeechRecognition;
  const recognition = new RecognitionCtor();
  recognition.lang = voiceLanguage;
  recognition.interimResults = true;
  recognition.continuous = true;
  ```

- **Speech Recognition Types** (Lines 43-60)
  ```tsx
  type SpeechRecognitionLike = {
    lang: string;
    interimResults: boolean;
    continuous: boolean;
    state?: string;
    addEventListener: (...) => void;
    removeEventListener: (...) => void;
    start: () => void;
    stop: () => void;
  };
  ```

- **Voice State Management** (Lines ~620-630)
  ```tsx
  const [isListening, setIsListening] = useState(false);
  const [speechSupported, setSpeechSupported] = useState(false);
  const [interimTranscript, setInterimTranscript] = useState("");
  const [voiceLanguage, setVoiceLanguage] = useState("en-US");
  const [voiceAutoSend, setVoiceAutoSend] = useState(true);
  const [voiceOutputEnabled, setVoiceOutputEnabled] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [outputLanguage, setOutputLanguage] = useState<OutputLanguage>("en");
  ```

- **Text-to-Speech Implementation** (Lines ~550-570)
  ```tsx
  const speakAssistantReply = (text: string) => {
    if (!voiceOutputEnabled || !("speechSynthesis" in window)) return;
    
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = voiceLanguage;
    utterance.rate = 1;
    utterance.pitch = 1;
    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => setIsSpeaking(false);
    window.speechSynthesis.speak(utterance);
  };
  ```

- **Speech Recognition Handlers** (Lines ~1110-1210)
  ```tsx
  const handleStart = () => { setIsListening(true); };
  const handleEnd = () => { setIsListening(false); };
  const handleError = (event) => { /* Handle errors */ };
  const handleResult = (event) => { /* Process transcription */ };
  
  recognition.addEventListener("start", handleStart);
  recognition.addEventListener("end", handleEnd);
  recognition.addEventListener("error", handleError);
  recognition.addEventListener("result", handleResult);
  ```

- **LocalStorage Keys** (Lines 196-200)
  ```tsx
  const CHAT_VOICE_LANGUAGE_KEY = "synapse.chat.voice.language";
  const CHAT_VOICE_AUTO_SEND_KEY = "synapse.chat.voice.autoSend";
  const CHAT_VOICE_OUTPUT_KEY = "synapse.chat.voice.output";
  const CHAT_LANGUAGE_KEY = "synapse_lang";
  const BANGLA_FONT_LINK_ID = "synapse-bengali-font-link";
  ```

- **Language Persistence** (Lines ~750-850)
  ```tsx
  // Hydrate voice settings from storage
  const [storedVoiceLanguage, storedVoiceAutoSend, storedVoiceOutput] = 
    await Promise.all([
      localforage.getItem<string>(CHAT_VOICE_LANGUAGE_KEY),
      localforage.getItem<boolean>(CHAT_VOICE_AUTO_SEND_KEY),
      localforage.getItem<boolean>(CHAT_VOICE_OUTPUT_KEY),
    ]);
  ```

- **Bengali Font Loading** (Lines ~860-870)
  ```tsx
  if (outputLanguage === "bn" && !document.getElementById(BANGLA_FONT_LINK_ID)) {
    const link = document.createElement("link");
    link.href = "https://fonts.googleapis.com/css2?family=Hind+Siliguri:wght@400;500;600;700&...";
    document.head.appendChild(link);
  }
  ```

- **API Call with Language** (Lines ~900-950)
  ```tsx
  const response = await fetch("/api/chat", {
    method: "POST",
    body: JSON.stringify({
      message: content,
      model: selectedModel,
      outputLanguage,  // ← Pass language to backend
      projectId,
      // ... other fields
    }),
  });
  ```

**Important Constants**:
- Output language enum: `type OutputLanguage = "en" | "bn"`
- Speech recognition languages: Any standard BCP 47 language tag (e.g., "en-US", "bn-BD")

---

### 2. **[WorkspaceLayout.tsx](client/src/components/workspace/WorkspaceLayout.tsx)**
**Purpose**: Passes `initialVoiceMode` prop to AIChatPanel

**Key Lines**:
- Line 31: `initialVoiceMode?: boolean;` (Type definition)
- Line 539: `export default function WorkspaceLayout({ projectId, initialVoiceMode = false }: WorkspaceLayoutProps)`
- Line 1883: `<AIChatPanel ... autoStartVoice={initialVoiceMode} />`

---

### 3. **[workspace.tsx](client/src/pages/workspace.tsx)** 
**Purpose**: URL parameter handling for voice mode

**Key Lines**:
- Line 11: `const [voiceMode, setVoiceMode] = useState(false);`
- Line 36: `const shouldStartVoice = params.get("voice") === "1";`
- Line 81: `return <WorkspaceLayout projectId={projectId} initialVoiceMode={voiceMode} />;`

**Usage**: Navigate to `/workspace?voice=1` to auto-start voice recording

---

### 4. **[dashboard.tsx](client/src/pages/dashboard.tsx)**
**Purpose**: Voice Build quick action button

**Key Lines**:
- Line 235: 
  ```tsx
  { 
    title: "Voice Build", 
    icon: Cpu, 
    color: "text-amber-400", 
    action: () => navigate("/workspace?voice=1") 
  }
  ```

---

### 5. **[index.css](client/src/index.css)**
**Purpose**: Bengali font styling

**Key Lines**:
- Lines 199-200:
  ```css
  .font-bn-chat {
    font-family: 'Hind Siliguri', 'Noto Sans Bengali', sans-serif;
  }
  ```

**Usage**: Apply `.font-bn-chat` class to Bengali text elements

---

## 🔧 Backend Files

### 6. **[aiGateway.ts](server/aiGateway.ts)** ⭐ MAIN BACKEND FILE
**Purpose**: AI response generation with language LocalStorage

**Key Implementations**:

- **Bengali System Prompt** (Lines 40-45):
  ```typescript
  const BANGLA_SYSTEM_PREFIX =
    "You are a Bengali-speaking assistant. All explanations, descriptions, error messages, and conversational text must be written in Bengali (বাংলা). " +
    "All code, variable names, file paths, and technical identifiers must remain in English. " +
    "Never translate code syntax or identifiers into Bengali.";
  ```

- **System Prompt Builder** (Lines 48-55):
  ```typescript
  function buildSystemPrompt(
    username: string,
    outputLanguage: "en" | "bn" = "en",
    projectContextLine = "",
  ): string {
    const prefix = outputLanguage === "bn" ? `${BANGLA_SYSTEM_PREFIX} ` : "";
    const contextPrefix = projectContextLine ? `${projectContextLine} ` : "";
    return `${prefix}${contextPrefix}${DEFAULT_SYSTEM_PROMPT} You are helping ${username} build web apps.`;
  }
  ```

- **Function Signatures**:
  ```typescript
  // Gemini streaming
  async function* generateWithGeminiStream(
    username: string,
    history: ChatMessage[],
    outputLanguage: "en" | "bn" = "en",
    ...
  ): AsyncGenerator<string, void, void>
  
  // Claude/Anthropic
  async function* generateWithAnthropicStream(
    username: string,
    history: ChatMessage[],
    outputLanguage: "en" | "bn" = "en",
    ...
  ): AsyncGenerator<string, void, void>
  
  // OpenAI
  async function* generateWithOpenAIStream(
    username: string,
    history: ChatMessage[],
    outputLanguage: "en" | "bn" = "en",
    ...
  ): AsyncGenerator<string, void, void>
  
  // Groq
  async function* generateWithGroqStream(
    username: string,
    history: ChatMessage[],
    outputLanguage: "en" | "bn" = "en",
    ...
  ): AsyncGenerator<string, void, void>
  
  // Perplexity
  async function generateWithPerplexity(
    username: string,
    history: ChatMessage[],
    outputLanguage: "en" | "bn" = "en",
    ...
  ): Promise<ProviderResult>
  ```

- **Provider Detection** (Lines 134-140):
  ```typescript
  async function generateWithFailoverStream(
    model: string,
    username: string,
    userId?: string,
    projectId?: string,
    learningMode?: boolean,
    outputLanguage: "en" | "bn" = "en",
    maxTokens?: number,
    history: ChatMessage[] = [],
  ): Promise<ProviderStreamResult>
  ```

**All functions receive `outputLanguage` parameter and build prompts accordingly**

---

### 7. **[routes.ts](server/routes.ts)**
**Purpose**: API endpoints for chat with language support

**Chat Request Schema** (Lines 55-61):
```typescript
const chatSchema = z.object({
  message: z.string().trim().min(1).max(4000),
  model: z.string().trim().min(1).max(100).optional(),
  outputLanguage: z.enum(["en", "bn"]).default("en"),
  projectId: z.string().uuid().optional(),
  learningMode: z.boolean().default(false),
});
```

**Chat Endpoint** (Lines 1053+):
```typescript
app.post("/api/chat", async (req, res) => {
  const { 
    message, 
    model: requestedModel, 
    outputLanguage = "en",  // ← Extract from request
    projectId,
    learningMode,
  } = chatSchema.parse(req.body);
  
  // Pass to AI gateway with language
  const stream = await generateWithFailoverStream(
    requestedModel || "auto",
    username,
    userId,
    projectId,
    learningMode,
    outputLanguage,  // ← Send to gateway
    undefined,
    history,
  );
});
```

**Suggestion Endpoint** (Lines 1239+):
```typescript
app.post("/api/chat/suggest", async (req, res) => {
  // Currently uses English only
  outputLanguage: "en",
});
```

---

### 8. **[shared/schema.ts](shared/schema.ts)**
**Purpose**: Shared type definitions

**Chat Message Schema** (Lines ~15-20):
```typescript
export const chatMessageSchema = z.object({
  message: z.string().trim().min(1).max(4000),
  model: z.string().trim().min(1).max(100).optional(),
  outputLanguage: z.enum(["en", "bn"]).default("en"),
});

export type ChatMessageInput = z.infer<typeof chatMessageSchema>;
```

---

## 🎤 Web Speech API Reference

### Browser Support
- **Chrome/Edge**: Full support (native)
- **Firefox**: Partial (may require flag)
- **Safari**: Limited support (uses webkit prefix)
- **Mobile**: Variable support

### Key APIs Used
```javascript
// Speech Recognition (STT)
const recognition = new (window.SpeechRecognition || 
                        window.webkitSpeechRecognition)();
recognition.lang = "en-US";
recognition.start();
recognition.addEventListener("result", handler);

// Speech Synthesis (TTS)
const utterance = new SpeechSynthesisUtterance("Hello");
utterance.lang = "en-US";
window.speechSynthesis.speak(utterance);
```

---

## 🌍 Language Configuration

### Supported Voice Languages (Speech Recognition)
Any BCP 47 language code:
- `en-US`: English (US)
- `en-GB`: English (UK)
- `en-IN`: English (India)
- `bn-BD`: Bengali (Bangladesh)
- `bn-IN`: Bengali (India)
- `hi-IN`: Hindi (India)
- `fr-FR`: French
- `es-ES`: Spanish
- etc.

### Supported Output Languages (AI Response)
Currently: `"en"` | `"bn"`

To add Hindi `"hi"`:
1. **Update types**: `type OutputLanguage = "en" | "bn" | "hi"`
2. **Add schema**: Update `z.enum` in schema.ts and routes.ts
3. **Add system prompt**: In aiGateway.ts:
   ```typescript
   const HINDI_SYSTEM_PREFIX = "You are a Hindi-speaking assistant...";
   ```
4. **Update buildSystemPrompt function**: Add Hindi case
5. **Update frontend**: Add "hi" to language select component

### Bengali Font Specifics
```html
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Hind+Siliguri:wght@400;500;600;700&family=Noto+Sans+Bengali:wght@400;500;600;700&display=swap" />
```

Classes:
- `font-bn-chat`: Bengali chat interface font

---

## 🔌 Integration Checklist

### For New Project Implementation

**Frontend Setup**:
- [ ] Copy AIChatPanel.tsx voice state and effects
- [ ] Add voice UI controls (mic button, language dropdown)
- [ ] Implement speech recognition initialization
- [ ] Add text-to-speech functionality
- [ ] Store voice preferences in localStorage/localforage
- [ ] Add Bengali fonts if supporting multiple languages
- [ ] Create language selector dropdown

**Backend Setup**:
- [ ] Define output language type (enum)
- [ ] Create system prompt builder function
- [ ] Add outputLanguage parameter to all AI functions
- [ ] Update chat schema validation
- [ ] Modify chat endpoint to pass language to AI gateway
- [ ] Update all AI provider functions (Gemini, Claude, GPT, Groq, Perplexity)

**API Integration**:
- [ ] POST `/api/chat` accepts `outputLanguage`
- [ ] All streaming endpoints support language parameter
- [ ] Response content respects language setting

**UI Components**:
- [ ] Mic button (enable/disable based on browser support)
- [ ] Language selector dropdown
- [ ] Voice output toggle
- [ ] Auto-send toggle
- [ ] Interim transcript display
- [ ] Error messages for:
  - Microphone permission denied
  - No speech detected
  - Speech API not supported
  - Browser compatibility issues

---

## 📊 Data Flow Diagram

```
User speaks
    ↓
Web Speech API (Browser STT)
    ↓
Recognition event handler
    ↓
setInputValue() + setInterimTranscript()
    ↓
User confirms / Auto-send triggered
    ↓
POST /api/chat {
  message: "transcribed text",
  outputLanguage: "bn",
  model: "claude-3.5-sonnet"
}
    ↓
Backend: buildSystemPrompt(username, "bn", ...)
    ↓
AI Provider Stream (with Bengali system prompt)
    ↓
Response in Bengali
    ↓
Frontend: speakAssistantReply(bengaliText)
    ↓
Web Speech API (Browser TTS)
    ↓
User hears Bengali response
```

---

## 🎨 UI Components Reference

### Voice Controls (in AIChatPanel)
```tsx
// Mic button toggle
<button onClick={shouldStartListening ? handleStartListening : handleStopListening}>
  {isListening ? <MicOff /> : <Mic />}
</button>

// Voice language selector
<Select value={voiceLanguage} onValueChange={setVoiceLanguage}>
  <SelectTrigger>
    <SelectValue />
  </SelectTrigger>
  <SelectContent>
    <SelectItem value="en-US">English (US)</SelectItem>
    <SelectItem value="bn-BD">Bengali (Bangladesh)</SelectItem>
    <SelectItem value="hi-IN">Hindi (India)</SelectItem>
  </SelectContent>
</Select>

// Auto-send toggle
<button onClick={() => setVoiceAutoSend(!voiceAutoSend)}>
  {voiceAutoSend ? "Auto-send ON" : "Auto-send OFF"}
</button>

// Voice output toggle
<button onClick={() => setVoiceOutputEnabled(!voiceOutputEnabled)}>
  {voiceOutputEnabled ? <Volume2 /> : <VolumeX />}
</button>

// Interim transcript display
{interimTranscript && <div className="text-muted-foreground italic">{interimTranscript}</div>}
```

---

## 🧪 Testing Voice Features

### Test Cases
1. **Microphone Permission**:
   - Grant permission → "Voice recording started"
   - Deny permission → "Microphone permission was denied"

2. **Speech Recognition**:
   - Speak → Interim transcript updates → Final transcript set
   - No speech → "Listening... I didn't catch anything"
   - Noise → Handles gracefully

3. **Language Selection**:
   - Change voice language → Recognition lang updates
   - Change output language → Backend receives language
   - Response in correct language

4. **Auto-send**:
   - Enabled → Message sends immediately after speech ends
   - Disabled → Message requires manual send

5. **Voice Output**:
   - Enabled → AI response spoken
   - Disabled → Response text only

### Debug Tips
```javascript
// Check if Speech API available
console.log(window.SpeechRecognition || window.webkitSpeechRecognition);

// Check stored language preference
localStorage.getItem("synapse_lang");

// Monitor recognition events
recognition.addEventListener("start", () => console.log("Recording started"));
recognition.addEventListener("result", (e) => console.log("Result:", e));
recognition.addEventListener("error", (e) => console.log("Error:", e.error));
```

---

## 📝 Notes

### Performance Considerations
- Speech API is resource-intensive; throttle recognition callbacks
- Use `debounceTime` for interim transcript updates in large apps
- Cache language settings to avoid re-fetching

### Browser Compatibility
- Test across Chrome, Firefox, Safari, Edge
- Provide fallback UI when speech API unavailable
- Handle webkit prefix for older browsers

### Accessibility
- Provide text input as alternative to voice
- Include error messages for accessibility readers
- Test with screen readers

### Security
- Validate `outputLanguage` enum on frontend AND backend
- Sanitize transcribed text (could include malicious input)
- Don't expose system prompts in client-side code

---

## 🚀 Quick Start Template

```tsx
// Minimal voice chat implementation
import { useState } from "react";

export default function VoiceChat() {
  const [transcript, setTranscript] = useState("");
  const [isListening, setIsListening] = useState(false);
  const [language, setLanguage] = useState("en-US");
  
  const recognition = new (window.SpeechRecognition || window.webkitSpeechRecognition)();
  
  const startListening = () => {
    recognition.lang = language;
    recognition.start();
    setIsListening(true);
    
    recognition.onresult = (event) => {
      let final = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        if (event.results[i].isFinal) {
          final += event.results[i][0].transcript;
        }
      }
      setTranscript(final);
    };
    
    recognition.onend = () => setIsListening(false);
  };
  
  const stopListening = () => {
    recognition.stop();
    setIsListening(false);
  };
  
  return (
    <div>
      <select value={language} onChange={(e) => setLanguage(e.target.value)}>
        <option value="en-US">English</option>
        <option value="bn-BD">Bengali</option>
        <option value="hi-IN">Hindi</option>
      </select>
      
      <button onClick={isListening ? stopListening : startListening}>
        {isListening ? "Stop" : "Start"} Recording
      </button>
      
      <p>Transcript: {transcript}</p>
    </div>
  );
}
```

---

## 📞 Support Files

### Related UI Components (shadcn/ui)
- `Select`: Language dropdown component
- `Button`: Mic button controls
- `Input`: Text input fallback

### Dependencies
- `lucide-react`: Icons (Mic, MicOff, Volume2, VolumeX)
- `localforage`: IndexedDB storage for preferences
- `zod`: Schema validation

### Environment Variables
None required for voice functionality (uses browser APIs)

---

## 🔗 External Resources

- [MDN: Web Speech API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Speech_API)
- [MDN: SpeechRecognition](https://developer.mozilla.org/en-US/docs/Web/API/SpeechRecognition)
- [MDN: SpeechSynthesis](https://developer.mozilla.org/en-US/docs/Web/API/SpeechSynthesis)
- [BCP 47 Language Tags](https://www.w3.org/International/questions/qa-what-is-bcp47)
- [Google Fonts Bengali](https://fonts.google.com/?subset=bengali)

---

**End of Document**
