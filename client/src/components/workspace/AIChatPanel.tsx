import { useState, useRef, useEffect, useCallback } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { apiRequest } from "@/lib/queryClient";
import { getAuthToken } from "@/lib/queryClient";
import localforage from "localforage";
import {
  Send,
  Mic,
  MicOff,
  Copy,
  Check,
  User,
  Bot,
  Code,
  RotateCcw,
  WandSparkles,
  Volume2,
  VolumeX,
  X,
} from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  codeBlocks?: { language: string; code: string }[];
  timestamp: string;
  editorChanges?: EditorChange[];
  appliedToEditor?: boolean;
}

type OutputLanguage = "en" | "bn";

type SpeechRecognitionLike = {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  state?: string;
  addEventListener: (
    type: "start" | "end" | "error" | "result",
    listener: (event: any) => void,
  ) => void;
  removeEventListener: (
    type: "start" | "end" | "error" | "result",
    listener: (event: any) => void,
  ) => void;
  start: () => void;
  stop: () => void;
};

type SpeechRecognitionConstructor = new () => SpeechRecognitionLike;

export type EditorChange = {
  path: string;
  language: string;
  content: string;
  action: "create" | "update";
};

type ReviewTarget = {
  messageId: string;
  changes: EditorChange[];
};

type FileSummary = {
  path: string;
  lineCount: number;
  lastModified: number;
};

type SuggestionHistoryEntry = {
  role: "user" | "assistant";
  content: string;
};

type DiffParseResult = {
  changes: EditorChange[];
  failedPaths: string[];
};

function normalizeStoredMessages(input: unknown): ChatMessage[] {
  if (!Array.isArray(input)) {
    return [];
  }

  const normalized: ChatMessage[] = [];

  for (let index = 0; index < input.length; index += 1) {
    const raw = input[index];
    if (!raw || typeof raw !== "object") {
      continue;
    }

    const candidate = raw as Partial<ChatMessage>;
    const role = candidate.role === "assistant" || candidate.role === "user" ? candidate.role : "assistant";
    const content = typeof candidate.content === "string"
      ? candidate.content
      : candidate.content == null
        ? ""
        : String(candidate.content);

    normalized.push({
      id: typeof candidate.id === "string" && candidate.id.trim() ? candidate.id : `restored-${index}`,
      role,
      content,
      codeBlocks: Array.isArray(candidate.codeBlocks) ? candidate.codeBlocks : undefined,
      timestamp: typeof candidate.timestamp === "string" ? candidate.timestamp : new Date().toLocaleTimeString("en-US", {
        hour: "numeric",
        minute: "2-digit",
      }),
      editorChanges: Array.isArray(candidate.editorChanges) ? candidate.editorChanges : undefined,
      appliedToEditor: Boolean(candidate.appliedToEditor),
    });
  }

  return normalized;
}

const initialMessages: ChatMessage[] = [
  {
    id: "1",
    role: "assistant",
    content: "Welcome to Synapse AI! I'm your coding assistant. I can help you build components, debug code, explain concepts, and more. What would you like to build today?",
    timestamp: "1:40 PM",
  },
  {
    id: "2",
    role: "user",
    content: "Create a hero section with a gradient heading and animated badge",
    timestamp: "1:41 PM",
  },
  {
    id: "3",
    role: "assistant",
    content: "I've generated a stunning hero section with a gradient heading and an animated badge. Here's the component:",
    codeBlocks: [
      {
        language: "tsx",
        code: `<section className="py-32 relative">
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    className="text-center"
  >
    <Badge animated>Now in Beta</Badge>
    <h1 className="text-7xl font-bold">
      Build Faster.
      <GradientText>Ship Smarter.</GradientText>
    </h1>
  </motion.div>
</section>`,
      },
    ],
    timestamp: "1:41 PM",
  },
  {
    id: "4",
    role: "user",
    content: "Can you add a CTA button with a hover animation?",
    timestamp: "1:42 PM",
  },
  {
    id: "5",
    role: "assistant",
    content: "Done! I've added a CTA button with a glowing hover effect and a smooth scale transition. The button uses the primary color and includes an arrow icon that moves on hover.",
    codeBlocks: [
      {
        language: "tsx",
        code: `<button className="group px-8 py-4 bg-primary 
  rounded-xl font-semibold shadow-lg 
  hover:shadow-primary/25 transition-all
  hover:scale-105 active:scale-95"
>
  Get Started
  <ArrowRight className="inline ml-2 
    group-hover:translate-x-1 transition" 
  />
</button>`,
      },
    ],
    timestamp: "1:42 PM",
  },
];

const CHAT_MESSAGES_KEY = "synapse.chat.messages";
const CHAT_MODEL_KEY = "synapse.chat.model";
const CHAT_VOICE_LANGUAGE_KEY = "synapse.chat.voice.language";
const CHAT_VOICE_AUTO_SEND_KEY = "synapse.chat.voice.autoSend";
const CHAT_VOICE_OUTPUT_KEY = "synapse.chat.voice.output";
const CHAT_LANGUAGE_KEY = "synapse_lang";
const BANGLA_FONT_LINK_ID = "synapse-bengali-font-link";

function inferLanguageFromPath(path: string): EditorChange["language"] {
  const lower = path.toLowerCase();
  if (lower.endsWith(".css")) return "css";
  if (lower.endsWith(".json")) return "json";
  if (lower.endsWith(".md") || lower.endsWith(".markdown")) return "markdown";
  if (lower.endsWith(".html")) return "html";
  return "typescript";
}

function extractEditorChangesFromJsonBlocks(content: string): EditorChange[] {
  const blockRegex = /```json\s*([\s\S]*?)```/gi;
  const parsed: EditorChange[] = [];

  for (const match of Array.from(content.matchAll(blockRegex))) {
    const jsonText = match[1]?.trim();
    if (!jsonText) {
      continue;
    }

    try {
      const payload = JSON.parse(jsonText) as {
        files?: Array<{ path?: unknown; content?: unknown }>;
      };

      if (!Array.isArray(payload.files)) {
        continue;
      }

      for (const file of payload.files) {
        if (typeof file.path !== "string" || typeof file.content !== "string") {
          continue;
        }

        const normalizedPath = file.path.trim().replace(/\\/g, "/");
        if (!normalizedPath) {
          continue;
        }

        parsed.push({
          path: normalizedPath,
          content: file.content,
          language: inferLanguageFromPath(normalizedPath),
          action: "update",
        });
      }
    } catch {
      // Ignore malformed JSON blocks.
    }
  }

  const deduped = new Map<string, EditorChange>();
  for (const change of parsed) {
    deduped.set(change.path, change);
  }

  return Array.from(deduped.values());
}

function normalizeDiffPath(rawPath: string): string | null {
  const trimmed = rawPath.trim();
  if (!trimmed || trimmed === "/dev/null") {
    return null;
  }

  return trimmed
    .replace(/^a\//, "")
    .replace(/^b\//, "")
    .replace(/^"|"$/g, "")
    .replace(/\\/g, "/");
}

function splitDiffSections(block: string, activeFilePath?: string): Array<{ path: string; patch: string }> {
  const lines = block.replace(/\r\n/g, "\n").split("\n");
  const sections: Array<{ path: string; lines: string[] }> = [];
  let current: { path: string; lines: string[] } | null = null;

  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i];
    const nextLine = i + 1 < lines.length ? lines[i + 1] : "";

    if (line.startsWith("--- ") && nextLine.startsWith("+++ ")) {
      if (current && current.lines.length > 0) {
        sections.push(current);
      }

      const parsedPath = normalizeDiffPath(nextLine.slice(4));
      current = parsedPath ? { path: parsedPath, lines: [] } : null;
      i += 1;
      continue;
    }

    if (current) {
      current.lines.push(line);
    }
  }

  if (current && current.lines.length > 0) {
    sections.push(current);
  }

  if (sections.length === 0 && activeFilePath) {
    return [{ path: activeFilePath, patch: block }];
  }

  return sections.map((entry) => ({
    path: entry.path,
    patch: entry.lines.join("\n"),
  }));
}

function applyUnifiedDiffToContent(original: string, patch: string): string | null {
  const source = original.replace(/\r\n/g, "\n");
  const hadTrailingNewline = source.endsWith("\n");
  const sourceLines = source.length === 0 ? [] : source.split("\n");

  if (hadTrailingNewline && sourceLines[sourceLines.length - 1] === "") {
    sourceLines.pop();
  }

  const patchLines = patch.replace(/\r\n/g, "\n").split("\n");
  const result: string[] = [];

  let sourceCursor = 0;
  let lineIndex = 0;
  let sawHunk = false;

  while (lineIndex < patchLines.length) {
    const line = patchLines[lineIndex];
    const hunkMatch = /^@@\s*-(\d+)(?:,(\d+))?\s*\+(\d+)(?:,(\d+))?\s*@@/.exec(line);

    if (!hunkMatch) {
      lineIndex += 1;
      continue;
    }

    sawHunk = true;
    const oldStart = Number(hunkMatch[1]);
    const hunkSourceStart = Math.max(oldStart - 1, 0);

    while (sourceCursor < hunkSourceStart) {
      result.push(sourceLines[sourceCursor] || "");
      sourceCursor += 1;
    }

    lineIndex += 1;
    while (lineIndex < patchLines.length && !patchLines[lineIndex].startsWith("@@")) {
      const patchLine = patchLines[lineIndex];

      if (!patchLine || patchLine.startsWith("\\")) {
        lineIndex += 1;
        continue;
      }

      const marker = patchLine[0];
      const text = patchLine.slice(1);
      const sourceLine = sourceLines[sourceCursor] || "";

      if (marker === " ") {
        if (sourceLine !== text) {
          return null;
        }
        result.push(sourceLine);
        sourceCursor += 1;
      } else if (marker === "-") {
        if (sourceLine !== text) {
          return null;
        }
        sourceCursor += 1;
      } else if (marker === "+") {
        result.push(text);
      }

      lineIndex += 1;
    }
  }

  if (!sawHunk) {
    return null;
  }

  while (sourceCursor < sourceLines.length) {
    result.push(sourceLines[sourceCursor]);
    sourceCursor += 1;
  }

  const joined = result.join("\n");
  return hadTrailingNewline ? `${joined}\n` : joined;
}

function extractEditorChangesFromDiffBlocks(
  content: string,
  activeFilePath: string | null,
  getFileContent?: (path: string) => string | undefined,
): DiffParseResult {
  const blockRegex = /```diff\s*([\s\S]*?)```/gi;
  const changes: EditorChange[] = [];
  const failedPaths: string[] = [];

  for (const match of Array.from(content.matchAll(blockRegex))) {
    const block = match[1]?.trim();
    if (!block) {
      continue;
    }

    const sections = splitDiffSections(block, activeFilePath || undefined);
    for (const section of sections) {
      const before = getFileContent?.(section.path) || "";
      const next = applyUnifiedDiffToContent(before, section.patch);

      if (next === null) {
        failedPaths.push(section.path);
        continue;
      }

      changes.push({
        path: section.path,
        content: next,
        language: inferLanguageFromPath(section.path),
        action: before ? "update" : "create",
      });
    }
  }

  const deduped = new Map<string, EditorChange>();
  for (const change of changes) {
    deduped.set(change.path, change);
  }

  return {
    changes: Array.from(deduped.values()),
    failedPaths,
  };
}

function CodeBlock({ language, code }: { language: string; code: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="mt-2 rounded-lg overflow-hidden border border-[hsl(240,5%,14%)]">
      <div className="flex items-center justify-between px-3 py-1.5 bg-[hsl(240,10%,8%)] border-b border-[hsl(240,5%,14%)]">
        <div className="flex items-center gap-1.5">
          <Code className="w-3 h-3 text-muted-foreground" />
          <span className="text-[10px] font-mono text-muted-foreground uppercase">{language}</span>
        </div>
        <button
          onClick={handleCopy}
          className="flex items-center gap-1 text-[10px] text-muted-foreground hover:text-foreground transition-colors"
        >
          {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
          {copied ? "Copied" : "Copy"}
        </button>
      </div>
      <pre className="p-3 bg-[hsl(240,10%,5%)] overflow-x-auto">
        <code className="text-[11px] font-mono text-foreground/90 leading-relaxed">{code}</code>
      </pre>
    </div>
  );
}

function MarkdownMessage({ content, className }: { content: string; className?: string }) {
  const safeContent = typeof content === "string" ? content : String(content ?? "");

  return (
    <div className={className}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          h1: ({ children }) => <h1 className="text-base font-semibold mt-2 mb-1">{children}</h1>,
          h2: ({ children }) => <h2 className="text-[15px] font-semibold mt-2 mb-1">{children}</h2>,
          h3: ({ children }) => <h3 className="text-sm font-semibold mt-2 mb-1">{children}</h3>,
          p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
          ul: ({ children }) => <ul className="list-disc pl-5 mb-2 space-y-1">{children}</ul>,
          ol: ({ children }) => <ol className="list-decimal pl-5 mb-2 space-y-1">{children}</ol>,
          li: ({ children }) => <li className="leading-relaxed">{children}</li>,
          strong: ({ children }) => <strong className="font-semibold text-foreground">{children}</strong>,
          em: ({ children }) => <em className="italic">{children}</em>,
          code: ({ children }) => (
            <code className="rounded bg-[hsl(240,10%,10%)] px-1 py-0.5 text-[12px] font-mono text-foreground/95">
              {children}
            </code>
          ),
          hr: () => <hr className="my-3 border-[hsl(240,5%,16%)]" />,
        }}
      >
        {safeContent}
      </ReactMarkdown>
    </div>
  );
}

interface AIChatPanelProps {
  onApplyToEditor: (changes: EditorChange[]) => void;
  getFileContent?: (path: string) => string | undefined;
  activeFilePath?: string | null;
  activeFileContent?: string;
  projectId?: string;
  learningMode?: boolean;
  otherFileSummaries?: FileSummary[];
  onTokenEstimateChange?: (tokens: number) => void;
  onStreamStart?: () => void;
  onStreamTokenToEditor?: (token: string) => void;
  onStreamEnd?: () => void;
  autoStartVoice?: boolean;
  prefillPrompt?: string;
  prefillPromptSeq?: number;
}

export default function AIChatPanel({
  onApplyToEditor,
  getFileContent,
  activeFilePath,
  activeFileContent,
  projectId,
  learningMode = false,
  otherFileSummaries = [],
  onTokenEstimateChange,
  onStreamStart,
  onStreamTokenToEditor,
  onStreamEnd,
  autoStartVoice = false,
  prefillPrompt,
  prefillPromptSeq = 0,
}: AIChatPanelProps) {
  const [inputValue, setInputValue] = useState("");
  const [selectedModel, setSelectedModel] = useState("claude-3.5-sonnet");
  const [messages, setMessages] = useState<ChatMessage[]>(initialMessages);
  const [isSending, setIsSending] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isHydrated, setIsHydrated] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [speechSupported, setSpeechSupported] = useState(false);
  const [interimTranscript, setInterimTranscript] = useState("");
  const [voiceLanguage, setVoiceLanguage] = useState("en-US");
  const [voiceAutoSend, setVoiceAutoSend] = useState(true);
  const [voiceOutputEnabled, setVoiceOutputEnabled] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [outputLanguage, setOutputLanguage] = useState<OutputLanguage>("en");
  const [reviewTarget, setReviewTarget] = useState<ReviewTarget | null>(null);
  const [isStreaming, setIsStreaming] = useState(false);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [pendingChipText, setPendingChipText] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const voiceAutoSendRef = useRef(true);
  const autoVoiceStartedRef = useRef(false);
  const shouldKeepListeningRef = useRef(false);
  const voiceErrorCountRef = useRef(0);
  const sendMessageRef = useRef<(forcedContent?: string) => Promise<void>>(async () => {
    // Populated by effect below.
  });
  const streamAbortControllerRef = useRef<AbortController | null>(null);
  const assistantStreamContentRef = useRef("");
  const suggestAbortControllerRef = useRef<AbortController | null>(null);
  const chipSubmitTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastSuggestedAssistantIdRef = useRef<string | null>(null);

  const speakAssistantReply = (text: string) => {
    if (typeof window === "undefined" || !voiceOutputEnabled || !("speechSynthesis" in window)) {
      return;
    }

    const clean = text.trim();
    if (!clean) {
      return;
    }

    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(clean);
    utterance.lang = voiceLanguage;
    utterance.rate = 1;
    utterance.pitch = 1;
    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);
    window.speechSynthesis.speak(utterance);
  };

  const stopSpeaking = () => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) {
      return;
    }
    window.speechSynthesis.cancel();
    setIsSpeaking(false);
  };

  const safeStartRecognition = async () => {
    const recognition = recognitionRef.current;
    if (!recognition) {
      setErrorMessage("Voice recognition is unavailable right now.");
      return;
    }

    recognition.lang = voiceLanguage;

    if ((recognition.state || "").toLowerCase() === "recording" || isListening) {
      return;
    }

    try {
      recognition.start();
    } catch (error) {
      const message = error instanceof Error ? error.message.toLowerCase() : "";
      if (
        message.includes("notallowed") ||
        message.includes("permission") ||
        message.includes("denied")
      ) {
        setErrorMessage("Microphone permission was denied. Please enable microphone access.");
        shouldKeepListeningRef.current = false;
      } else if (message.includes("already started")) {
        // Already running, ignore.
      } else {
        setErrorMessage("Unable to start voice input. Please try again.");
      }
    }
  };

  const safeStopRecognition = () => {
    shouldKeepListeningRef.current = false;
    setInterimTranscript("");
    try {
      recognitionRef.current?.stop();
    } catch {
      // Ignore stop errors.
    }
  };

  useEffect(() => {
    let mounted = true;

    async function hydrateChatState() {
      try {
        const [storedMessages, storedModel] = await Promise.all([
          localforage.getItem<ChatMessage[]>(CHAT_MESSAGES_KEY),
          localforage.getItem<string>(CHAT_MODEL_KEY),
        ]);
        const [storedVoiceLanguage, storedVoiceAutoSend, storedVoiceOutput] = await Promise.all([
          localforage.getItem<string>(CHAT_VOICE_LANGUAGE_KEY),
          localforage.getItem<boolean>(CHAT_VOICE_AUTO_SEND_KEY),
          localforage.getItem<boolean>(CHAT_VOICE_OUTPUT_KEY),
        ]);
        const storedLanguage = window.localStorage.getItem(CHAT_LANGUAGE_KEY);

        if (!mounted) {
          return;
        }

        const normalizedStoredMessages = normalizeStoredMessages(storedMessages);
        if (normalizedStoredMessages.length > 0) {
          setMessages(normalizedStoredMessages);
        }

        if (storedModel) {
          setSelectedModel(storedModel);
        }

        if (storedVoiceLanguage) {
          setVoiceLanguage(storedVoiceLanguage);
        }

        if (typeof storedVoiceAutoSend === "boolean") {
          setVoiceAutoSend(storedVoiceAutoSend);
        }

        if (typeof storedVoiceOutput === "boolean") {
          setVoiceOutputEnabled(storedVoiceOutput);
        }

        if (storedLanguage === "bn" || storedLanguage === "en") {
          setOutputLanguage(storedLanguage);
        }
      } catch {
        // If local persistence fails, continue with in-memory defaults.
      } finally {
        if (mounted) {
          setIsHydrated(true);
        }
      }
    }

    void hydrateChatState();

    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if (!isHydrated) {
      return;
    }

    void localforage.setItem(CHAT_MESSAGES_KEY, messages);
  }, [messages, isHydrated]);

  useEffect(() => {
    if (!isHydrated) {
      return;
    }

    void localforage.setItem(CHAT_MODEL_KEY, selectedModel);
  }, [selectedModel, isHydrated]);

  useEffect(() => {
    if (!isHydrated) {
      return;
    }

    void localforage.setItem(CHAT_VOICE_LANGUAGE_KEY, voiceLanguage);
  }, [voiceLanguage, isHydrated]);

  useEffect(() => {
    if (!isHydrated) {
      return;
    }

    void localforage.setItem(CHAT_VOICE_AUTO_SEND_KEY, voiceAutoSend);
  }, [voiceAutoSend, isHydrated]);

  useEffect(() => {
    voiceAutoSendRef.current = voiceAutoSend;
  }, [voiceAutoSend]);

  useEffect(() => {
    if (!isHydrated) {
      return;
    }

    void localforage.setItem(CHAT_VOICE_OUTPUT_KEY, voiceOutputEnabled);
  }, [voiceOutputEnabled, isHydrated]);

  useEffect(() => {
    if (!isHydrated) {
      return;
    }

    window.localStorage.setItem(CHAT_LANGUAGE_KEY, outputLanguage);

    if (outputLanguage === "bn" && !document.getElementById(BANGLA_FONT_LINK_ID)) {
      const link = document.createElement("link");
      link.id = BANGLA_FONT_LINK_ID;
      link.rel = "stylesheet";
      link.href = "https://fonts.googleapis.com/css2?family=Hind+Siliguri:wght@400;500;600;700&family=Noto+Sans+Bengali:wght@400;500;600;700&display=swap";
      document.head.appendChild(link);
    }
  }, [outputLanguage, isHydrated]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  useEffect(() => {
    if (!onTokenEstimateChange) {
      return;
    }

    const messageChars = messages.reduce((total, message) => total + message.content.length, 0);
    const summariesChars = JSON.stringify(otherFileSummaries).length;
    const activeChars = activeFileContent?.length || 0;
    const draftChars = inputValue.length;
    const estimatedTokens = Math.ceil((messageChars + summariesChars + activeChars + draftChars) / 4);
    onTokenEstimateChange(estimatedTokens);
  }, [messages, otherFileSummaries, activeFileContent, inputValue, onTokenEstimateChange]);

  const isInsideCodeFence = useCallback((value: string) => {
    const fences = value.match(/```/g);
    return (fences?.length || 0) % 2 === 1;
  }, []);

  const readSseEvents = useCallback(async function* (response: Response) {
    if (!response.body) {
      return;
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";

    while (true) {
      const { value, done } = await reader.read();
      if (done) {
        break;
      }

      buffer += decoder.decode(value, { stream: true });

      while (true) {
        const boundary = buffer.indexOf("\n\n");
        if (boundary === -1) {
          break;
        }

        const rawEvent = buffer.slice(0, boundary);
        buffer = buffer.slice(boundary + 2);

        const dataLines = rawEvent
          .split("\n")
          .filter((line) => line.startsWith("data:"))
          .map((line) => line.slice(5).trim())
          .filter(Boolean);

        for (const line of dataLines) {
          try {
            yield JSON.parse(line) as { token?: string; done?: boolean; error?: string; message?: ChatMessage; editorChanges?: EditorChange[] };
          } catch {
            // Ignore malformed event payload.
          }
        }
      }
    }
  }, []);

  const sendMessage = useCallback(async (forcedContent?: string) => {
    const content = (forcedContent ?? inputValue).trim();
    if (!content || isSending || isStreaming) {
      return;
    }

    const userMessage: ChatMessage = {
      id: `${Date.now()}-user`,
      role: "user",
      content,
      timestamp: new Date().toLocaleTimeString("en-US", {
        hour: "numeric",
        minute: "2-digit",
      }),
    };

    const assistantMessageId = `${Date.now()}-assistant-stream`;
    const assistantPlaceholder: ChatMessage = {
      id: assistantMessageId,
      role: "assistant",
      content: "",
      timestamp: new Date().toLocaleTimeString("en-US", {
        hour: "numeric",
        minute: "2-digit",
      }),
      appliedToEditor: false,
    };

    setMessages((prev) => [...prev, userMessage, assistantPlaceholder]);
    setInputValue("");
    setIsSending(true);
    setIsStreaming(true);
    setErrorMessage(null);
    assistantStreamContentRef.current = "";
    onStreamStart?.();

    const controller = new AbortController();
    streamAbortControllerRef.current = controller;

    try {
      const token = getAuthToken();
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          message: content,
          model: selectedModel,
          outputLanguage,
          projectId,
          learningMode,
          context: {
            activeFile: activeFilePath
              ? {
                path: activeFilePath,
                content: activeFileContent || "",
              }
              : null,
            otherFiles: otherFileSummaries,
          },
        }),
        signal: controller.signal,
      });

      if (!response.ok) {
        const text = await response.text();
        throw new Error(`${response.status}: ${text || response.statusText}`);
      }

      let finalPayload: { message?: ChatMessage; editorChanges?: EditorChange[] } | null = null;

      for await (const event of readSseEvents(response)) {
        if (event.error) {
          setErrorMessage(event.error);
        }

        if (event.token) {
          assistantStreamContentRef.current += event.token;

          if (isInsideCodeFence(assistantStreamContentRef.current)) {
            onStreamTokenToEditor?.(event.token);
          }

          setMessages((prev) =>
            prev.map((entry) =>
              entry.id === assistantMessageId
                ? { ...entry, content: entry.content + event.token }
                : entry,
            ),
          );
        }

        if (event.done) {
          finalPayload = {
            message: event.message,
            editorChanges: event.editorChanges,
          };
          break;
        }
      }

      const assistantContent = assistantStreamContentRef.current;
      const diffResult = extractEditorChangesFromDiffBlocks(assistantContent, activeFilePath || null, getFileContent);
      const jsonBlockChanges = extractEditorChangesFromJsonBlocks(assistantContent);

      const normalizedChanges = ((finalPayload?.editorChanges && finalPayload.editorChanges.length > 0)
        ? finalPayload.editorChanges
        : diffResult.changes.length > 0
          ? diffResult.changes
          : jsonBlockChanges
      ).map((change) => ({
        ...change,
        language: change.language || inferLanguageFromPath(change.path),
        action: change.action || "update",
      }));

      if (diffResult.failedPaths.length > 0 && !content.startsWith("Patch apply fallback:")) {
        const uniqueFailed = Array.from(new Set(diffResult.failedPaths));
        const fallbackPrompt = `Patch apply fallback: unified diff failed for ${uniqueFailed.join(", ")}. Please provide full updated file contents for those files.`;
        setErrorMessage("Patch failed to apply cleanly for one or more files. Requesting full file content fallback...");
        window.setTimeout(() => {
          void sendMessageRef.current(fallbackPrompt);
        }, 0);
      }

      setMessages((prev) =>
        prev.map((entry) =>
          entry.id === assistantMessageId
            ? {
              ...entry,
              content: assistantContent,
              editorChanges: normalizedChanges,
              appliedToEditor: false,
            }
            : entry,
        ),
      );

      if (assistantContent.trim()) {
        speakAssistantReply(assistantContent);
      }
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") {
        setErrorMessage("Streaming stopped.");
      }
      const message = error instanceof Error ? error.message : "Failed to send message";
      if (!(error instanceof Error && error.name === "AbortError")) {
        setErrorMessage(message.startsWith("401:") ? "Please sign in to use AI chat." : message);
      }
    } finally {
      setIsSending(false);
      setIsStreaming(false);
      streamAbortControllerRef.current = null;
      onStreamEnd?.();
    }
  }, [
    inputValue,
    isSending,
    isStreaming,
    selectedModel,
    outputLanguage,
    projectId,
    learningMode,
    activeFilePath,
    activeFileContent,
    otherFileSummaries,
    getFileContent,
    onStreamStart,
    onStreamTokenToEditor,
    onStreamEnd,
    readSseEvents,
    isInsideCodeFence,
  ]);

  const requestSuggestions = useCallback(async (history: SuggestionHistoryEntry[]) => {
    if (history.length === 0) {
      return;
    }

    try {
      suggestAbortControllerRef.current?.abort();
      const controller = new AbortController();
      suggestAbortControllerRef.current = controller;

      const token = getAuthToken();
      const response = await fetch("/api/chat/suggest", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          history,
          currentFile: activeFilePath || "",
        }),
        signal: controller.signal,
      });

      if (!response.ok) {
        return;
      }

      const payload = (await response.json()) as { suggestions?: unknown };
      if (!Array.isArray(payload.suggestions)) {
        return;
      }

      const normalized = payload.suggestions
        .map((entry) => (typeof entry === "string" ? entry.trim() : ""))
        .filter(Boolean)
        .slice(0, 3);

      setSuggestions(normalized);
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") {
        return;
      }
      // Silent fail for background suggestion requests.
    }
  }, [activeFilePath]);

  useEffect(() => {
    if (isStreaming || isSending) {
      return;
    }

    const assistantMessages = messages.filter((entry) => entry.role === "assistant" && entry.content.trim().length > 0);
    const latestAssistant = assistantMessages[assistantMessages.length - 1];
    if (!latestAssistant) {
      return;
    }

    if (latestAssistant.id === lastSuggestedAssistantIdRef.current) {
      return;
    }

    lastSuggestedAssistantIdRef.current = latestAssistant.id;
    const recentHistory = messages
      .filter((entry) => (entry.role === "assistant" || entry.role === "user") && entry.content.trim().length > 0)
      .slice(-6)
      .map((entry) => ({
        role: entry.role,
        content: entry.content.length > 2000 ? entry.content.slice(0, 2000) : entry.content,
      }));

    void requestSuggestions(recentHistory);
  }, [messages, isStreaming, isSending, requestSuggestions]);

  useEffect(() => {
    return () => {
      suggestAbortControllerRef.current?.abort();
      if (chipSubmitTimeoutRef.current) {
        clearTimeout(chipSubmitTimeoutRef.current);
      }
    };
  }, []);

  const handleSuggestionClick = useCallback((chipText: string) => {
    if (chipSubmitTimeoutRef.current) {
      clearTimeout(chipSubmitTimeoutRef.current);
    }

    setInputValue(chipText);
    setPendingChipText(chipText);

    chipSubmitTimeoutRef.current = setTimeout(() => {
      void sendMessageRef.current(chipText);
      setPendingChipText(null);
      chipSubmitTimeoutRef.current = null;
    }, 300);
  }, []);

  const cancelPendingChipSubmit = useCallback(() => {
    if (chipSubmitTimeoutRef.current) {
      clearTimeout(chipSubmitTimeoutRef.current);
      chipSubmitTimeoutRef.current = null;
    }
    setPendingChipText(null);
  }, []);

  useEffect(() => {
    sendMessageRef.current = sendMessage;
  }, [sendMessage]);

  useEffect(() => {
    if (!prefillPrompt || !prefillPrompt.trim()) {
      return;
    }

    setInputValue(prefillPrompt);
  }, [prefillPromptSeq, prefillPrompt]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const speechWindow = window as Window & {
      SpeechRecognition?: SpeechRecognitionConstructor;
      webkitSpeechRecognition?: SpeechRecognitionConstructor;
    };

    const RecognitionCtor = speechWindow.SpeechRecognition || speechWindow.webkitSpeechRecognition;
    if (!RecognitionCtor) {
      setSpeechSupported(false);
      return;
    }

    // Create and bind recognition handlers once to prevent duplicate event subscriptions.
    const recognition = new RecognitionCtor();
    recognition.lang = voiceLanguage;
    recognition.interimResults = true;
    recognition.continuous = true;

    const handleStart = () => {
      voiceErrorCountRef.current = 0;
      setIsListening(true);
      setErrorMessage(null);
      setInterimTranscript("");
    };

    const handleEnd = () => {
      setIsListening(false);
      setInterimTranscript("");

      if (shouldKeepListeningRef.current) {
        setTimeout(() => {
          void safeStartRecognition();
        }, 220);
      }
    };

    const handleError = (event: { error?: string }) => {
      setIsListening(false);
      setInterimTranscript("");

      if (event.error === "not-allowed") {
        voiceErrorCountRef.current = 0;
        shouldKeepListeningRef.current = false;
        setErrorMessage("Microphone access denied. Please enable microphone permissions in browser settings.");
      } else if (event.error === "no-speech") {
        // Automatically retry on no-speech error (user was silent) but with a limit
        if (shouldKeepListeningRef.current && voiceErrorCountRef.current < 3) {
          voiceErrorCountRef.current += 1;
          setTimeout(() => {
            void safeStartRecognition();
          }, 500);
        } else if (voiceErrorCountRef.current >= 3) {
          voiceErrorCountRef.current = 0;
          setErrorMessage("No speech detected after multiple attempts. Please try again.");
          shouldKeepListeningRef.current = false;
        }
      } else if (event.error === "aborted") {
        voiceErrorCountRef.current = 0;
        // User-initiated stop, no error message.
      } else if (event.error === "network") {
        voiceErrorCountRef.current += 1;
        shouldKeepListeningRef.current = false;
        setErrorMessage("Voice service unavailable. Check your internet connection or try your browser's voice settings.");
      } else if (event.error === "audio-capture") {
        voiceErrorCountRef.current = 0;
        shouldKeepListeningRef.current = false;
        setErrorMessage("No microphone found or it's not working. Please check your audio device.");
      } else if (event.error === "service-not-available") {
        voiceErrorCountRef.current = 0;
        shouldKeepListeningRef.current = false;
        setErrorMessage("Speech recognition service is not available. Try again in a moment.");
      } else if (event.error) {
        voiceErrorCountRef.current += 1;
        // Generic error fallback
        setErrorMessage(`Voice error: ${event.error}. Please try again.`);
      }
    };

    const handleResult = (event: {
      resultIndex: number;
      results: ArrayLike<ArrayLike<{ transcript: string }> & { isFinal?: boolean }>;
    }) => {
      let finalTranscript = "";
      let interim = "";

      for (let i = event.resultIndex; i < event.results.length; i += 1) {
        const result = event.results[i];
        const chunk = result[0]?.transcript || "";
        const isFinalChunk = typeof result.isFinal === "boolean"
          ? result.isFinal
          : i === event.results.length - 1;

        if (isFinalChunk) {
          finalTranscript += chunk;
        } else {
          interim += chunk;
        }
      }

      setInterimTranscript(interim.trim());

      const finalText = finalTranscript.trim();
      if (!finalText) {
        return;
      }

      setInterimTranscript("");
      setInputValue(finalText);

      if (voiceAutoSendRef.current) {
        void sendMessageRef.current(finalText);
      } else {
        setInputValue((prev) => `${prev} ${finalText}`.trim());
      }
    };

    recognition.addEventListener("start", handleStart);
    recognition.addEventListener("end", handleEnd);
    recognition.addEventListener("error", handleError);
    recognition.addEventListener("result", handleResult);

    recognitionRef.current = recognition;
    setSpeechSupported(true);

    return () => {
      recognition.removeEventListener("start", handleStart);
      recognition.removeEventListener("end", handleEnd);
      recognition.removeEventListener("error", handleError);
      recognition.removeEventListener("result", handleResult);
      shouldKeepListeningRef.current = false;
      recognition.stop();
      recognitionRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (!recognitionRef.current) {
      return;
    }

    recognitionRef.current.lang = voiceLanguage;
  }, [voiceLanguage]);

  useEffect(() => {
    if (!autoStartVoice || !speechSupported || isSending || autoVoiceStartedRef.current) {
      return;
    }

    setVoiceAutoSend(true);
    autoVoiceStartedRef.current = true;
    shouldKeepListeningRef.current = true;
    void safeStartRecognition();
  }, [autoStartVoice, speechSupported, isSending, voiceLanguage]);

  useEffect(() => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) {
      return;
    }

    return () => {
      window.speechSynthesis.cancel();
    };
  }, []);

  const handleMicClick = () => {
    if (!speechSupported) {
      setErrorMessage("Voice input is not supported in this browser.");
      return;
    }

    if (!recognitionRef.current) {
      setErrorMessage("Voice recognition is unavailable right now.");
      return;
    }

    if (isListening) {
      safeStopRecognition();
      return;
    }

    stopSpeaking();
    shouldKeepListeningRef.current = true;
    void safeStartRecognition();
  };

  const openReviewForMessage = (message: ChatMessage) => {
    if (!message.editorChanges || message.editorChanges.length === 0) {
      return;
    }

    setReviewTarget({
      messageId: message.id,
      changes: message.editorChanges,
    });
  };

  const applyReviewedChanges = () => {
    if (!reviewTarget || reviewTarget.changes.length === 0) {
      return;
    }

    onApplyToEditor(reviewTarget.changes);
    setMessages((prev) =>
      prev.map((entry) =>
        entry.id === reviewTarget.messageId
          ? { ...entry, appliedToEditor: true }
          : entry,
      ),
    );
    setReviewTarget(null);
  };

  return (
    <div className="h-full flex flex-col bg-[hsl(240,10%,4%)]">
      {/* Header */}
      <div className="px-4 py-3 border-b border-[hsl(240,5%,12%)] bg-[hsl(240,10%,5%)] flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-sm">Synapse AI</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="flex h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-[10px] text-muted-foreground font-medium">Active</span>
          <div className="flex items-center rounded border border-[hsl(240,5%,16%)] bg-[hsl(240,10%,7%)] overflow-hidden">
            <button
              type="button"
              onClick={() => setOutputLanguage("en")}
              className={`px-2 py-0.5 text-[10px] ${outputLanguage === "en" ? "bg-primary/20 text-primary" : "text-muted-foreground hover:text-foreground"}`}
            >
              EN
            </button>
            <button
              type="button"
              onClick={() => setOutputLanguage("bn")}
              className={`px-2 py-0.5 text-[10px] ${outputLanguage === "bn" ? "bg-primary/20 text-primary" : "text-muted-foreground hover:text-foreground"}`}
            >
              বাং
            </button>
          </div>
          {isStreaming && (
            <button
              onClick={() => {
                streamAbortControllerRef.current?.abort();
              }}
              className="px-2 py-0.5 rounded border border-red-500/30 bg-red-500/10 text-[10px] text-red-300 hover:bg-red-500/20"
            >
              Stop
            </button>
          )}
          <button
            onClick={() => {
              setMessages(initialMessages);
              setErrorMessage(null);
              void localforage.removeItem(CHAT_MESSAGES_KEY);
            }}
            className="p-1 rounded hover:bg-[hsl(240,5%,12%)] text-muted-foreground hover:text-foreground transition-colors ml-1"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Messages */}
      <ScrollArea className="flex-1">
        <div ref={scrollRef} className="p-4 space-y-4">
          {messages.map((msg) => (
            <div key={msg.id} className={`flex gap-2.5 ${msg.role === "user" ? "justify-end" : ""}`}>
              {msg.role === "assistant" && (
                <div className="w-6 h-6 rounded-full bg-linear-to-br from-primary/30 to-amber-500/30 flex items-center justify-center shrink-0 mt-0.5">
                  <Bot className="w-3.5 h-3.5 text-primary" />
                </div>
              )}
              <div className={`max-w-[85%] ${msg.role === "user" ? "order-first" : ""}`}>
                <div
                  className={`p-3 rounded-xl text-[13px] leading-relaxed ${msg.role === "user"
                    ? "bg-primary/20 border border-primary/30 text-foreground rounded-tr-sm"
                    : "bg-[hsl(240,10%,7%)] border border-[hsl(240,5%,14%)] text-foreground/90 rounded-tl-sm"
                    }`}
                >
                  {msg.role === "assistant" ? (
                    <MarkdownMessage content={msg.content} className={outputLanguage === "bn" ? "font-bn-chat" : undefined} />
                  ) : (
                    msg.content
                  )}
                  {msg.codeBlocks?.map((block, i) => (
                    <CodeBlock key={i} language={block.language} code={block.code} />
                  ))}

                  {msg.role === "assistant" && msg.editorChanges && msg.editorChanges.length > 0 && (
                    <div className="mt-3 flex items-center gap-2">
                      <button
                        onClick={() => openReviewForMessage(msg)}
                        disabled={msg.appliedToEditor}
                        className="inline-flex items-center gap-1.5 rounded-md border border-primary/40 bg-primary/15 px-2 py-1 text-[11px] text-primary hover:bg-primary/25 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        <WandSparkles className="h-3 w-3" />
                        {msg.appliedToEditor ? "Applied to Editor" : "Review all changes"}
                      </button>
                      <span className="text-[10px] text-muted-foreground/70">
                        {msg.editorChanges.length} file change{msg.editorChanges.length > 1 ? "s" : ""}
                      </span>
                    </div>
                  )}
                </div>
                <span className="text-[10px] text-muted-foreground/50 mt-1 px-1 block">
                  {msg.timestamp}
                </span>
              </div>
              {msg.role === "user" && (
                <div className="w-6 h-6 rounded-full bg-[hsl(240,10%,12%)] flex items-center justify-center shrink-0 mt-0.5">
                  <User className="w-3.5 h-3.5 text-muted-foreground" />
                </div>
              )}
            </div>
          ))}
        </div>
      </ScrollArea>

      {/* Input */}
      <div className="p-3 border-t border-[hsl(240,5%,12%)] bg-[hsl(240,10%,5%)] shrink-0">
        {suggestions.length > 0 && (
          <div className="mb-2 flex flex-wrap items-center gap-2">
            {suggestions.map((chip) => (
              <button
                key={chip}
                type="button"
                onClick={() => handleSuggestionClick(chip)}
                className="rounded-full border border-[hsl(240,5%,16%)] bg-[hsl(240,10%,7%)] px-2.5 py-1 text-[11px] text-muted-foreground hover:border-primary/40 hover:text-foreground"
              >
                {chip}
              </button>
            ))}
            {pendingChipText && (
              <button
                type="button"
                onClick={cancelPendingChipSubmit}
                className="rounded-full border border-red-500/30 bg-red-500/10 px-2.5 py-1 text-[11px] text-red-300 hover:bg-red-500/20"
              >
                Cancel
              </button>
            )}
          </div>
        )}
        <div className="relative">
          <textarea
            value={inputValue}
            onChange={(e) => {
              const next = e.target.value;
              setInputValue(next);

              if (next.trim().length > 0) {
                if (suggestions.length > 0) {
                  setSuggestions([]);
                }
                cancelPendingChipSubmit();
              }
            }}
            onKeyDown={(e) => {
              if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
                e.preventDefault();
                void sendMessage();
              }
            }}
            placeholder="Ask Synapse AI anything..."
            rows={2}
            className="w-full bg-[hsl(240,10%,6%)] border border-[hsl(240,5%,14%)] rounded-xl pl-10 pr-12 py-3 text-[13px] text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:border-primary/50 resize-none transition-colors"
          />
          <button
            onClick={handleMicClick}
            className={`absolute left-3 top-3.5 transition-colors ${isListening ? "text-primary" : "text-muted-foreground/50 hover:text-primary"}`}
            title={isListening ? "Stop voice capture" : "Start voice capture"}
            type="button"
          >
            {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
          </button>
          <button
            onClick={() => {
              void sendMessage();
            }}
            disabled={isSending || isStreaming}
            className="absolute right-3 bottom-3 p-1.5 bg-primary/20 hover:bg-primary/40 disabled:opacity-50 text-primary rounded-lg transition-colors"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
        {errorMessage && <div className="mt-2 text-[10px] text-red-400">{errorMessage}</div>}
        {interimTranscript && (
          <div className="mt-1 text-[10px] text-primary/90">Hearing: {interimTranscript}</div>
        )}
        <div className="mt-2 px-1 space-y-1.5">
          <div className="flex flex-wrap items-center gap-2">
            <Select value={selectedModel} onValueChange={setSelectedModel}>
              <SelectTrigger className="h-6 w-35 max-w-full text-[10px] bg-[hsl(240,10%,8%)] border-[hsl(240,5%,16%)] text-muted-foreground focus:ring-0 focus:ring-offset-0">
                <SelectValue placeholder="Select Model" />
              </SelectTrigger>
              <SelectContent className="bg-[hsl(240,10%,8%)] border-[hsl(240,5%,16%)]">
                <SelectItem value="claude-3.5-sonnet" className="text-[10px]">Claude 3.5 Sonnet</SelectItem>
                <SelectItem value="gpt-4o" className="text-[10px]">GPT-4o</SelectItem>
                <SelectItem value="gemini-1.5-pro" className="text-[10px]">Gemini 1.5 Pro</SelectItem>
                <SelectItem value="llama-3-70b" className="text-[10px]">Llama 3 (70B)</SelectItem>
              </SelectContent>
            </Select>
            <Select value={voiceLanguage} onValueChange={setVoiceLanguage}>
              <SelectTrigger className="h-6 w-28 max-w-full text-[10px] bg-[hsl(240,10%,8%)] border-[hsl(240,5%,16%)] text-muted-foreground focus:ring-0 focus:ring-offset-0">
                <SelectValue placeholder="Voice lang" />
              </SelectTrigger>
              <SelectContent className="bg-[hsl(240,10%,8%)] border-[hsl(240,5%,16%)]">
                <SelectItem value="en-US" className="text-[10px]">EN (US)</SelectItem>
                <SelectItem value="en-GB" className="text-[10px]">EN (UK)</SelectItem>
                <SelectItem value="hi-IN" className="text-[10px]">Hindi</SelectItem>
                <SelectItem value="bn-BD" className="text-[10px]">Bangla</SelectItem>
              </SelectContent>
            </Select>
            <button
              type="button"
              onClick={() => setVoiceAutoSend((prev) => !prev)}
              className={`h-6 px-2 rounded border text-[10px] transition-colors ${voiceAutoSend
                ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-300"
                : "border-[hsl(240,5%,16%)] text-muted-foreground hover:text-foreground"
                }`}
              title="Auto-send recognized speech"
            >
              Auto-send
            </button>
            <button
              type="button"
              onClick={() => {
                if (isSpeaking) {
                  stopSpeaking();
                  return;
                }
                setVoiceOutputEnabled((prev) => !prev);
              }}
              className={`h-6 px-2 rounded border text-[10px] transition-colors ${voiceOutputEnabled
                ? "border-sky-500/40 bg-sky-500/10 text-sky-300"
                : "border-[hsl(240,5%,16%)] text-muted-foreground hover:text-foreground"
                }`}
              title={isSpeaking ? "Stop speaking" : "Toggle voice output"}
            >
              {isSpeaking ? (
                <span className="inline-flex items-center gap-1"><VolumeX className="h-3 w-3" /> Stop Voice</span>
              ) : (
                <span className="inline-flex items-center gap-1"><Volume2 className="h-3 w-3" /> Voice Out</span>
              )}
            </button>
          </div>
          <div className="text-[10px] text-muted-foreground/40">
            {isListening ? "Listening... speak now" : voiceAutoSend ? "Ctrl/Cmd + Enter to send" : "Voice collects text. Send manually."}
          </div>
        </div>
      </div>

      {reviewTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="w-full max-w-5xl max-h-[85vh] overflow-hidden rounded-xl border border-[hsl(240,5%,15%)] bg-[hsl(240,10%,6%)] shadow-2xl">
            <div className="flex items-center justify-between border-b border-[hsl(240,5%,14%)] px-4 py-3">
              <div>
                <h3 className="text-sm font-semibold text-foreground">Review all changes</h3>
                <p className="text-[11px] text-muted-foreground">{reviewTarget.changes.length} file update{reviewTarget.changes.length > 1 ? "s" : ""}</p>
              </div>
              <button
                onClick={() => setReviewTarget(null)}
                className="rounded p-1 text-muted-foreground hover:bg-[hsl(240,5%,14%)] hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="max-h-[60vh] overflow-auto p-4 space-y-4">
              {reviewTarget.changes.map((change) => {
                const before = getFileContent?.(change.path) || "";
                return (
                  <div key={change.path} className="rounded-lg border border-[hsl(240,5%,14%)] bg-[hsl(240,10%,5%)]">
                    <div className="border-b border-[hsl(240,5%,14%)] px-3 py-2 text-xs font-medium text-foreground">
                      {change.path}
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-0">
                      <div className="border-b md:border-b-0 md:border-r border-[hsl(240,5%,14%)]">
                        <div className="px-3 py-1 text-[10px] uppercase tracking-wider text-muted-foreground">Before</div>
                        <pre className="max-h-56 overflow-auto px-3 pb-3 text-[11px] text-foreground/80"><code>{before || "(new file)"}</code></pre>
                      </div>
                      <div>
                        <div className="px-3 py-1 text-[10px] uppercase tracking-wider text-primary">After</div>
                        <pre className="max-h-56 overflow-auto px-3 pb-3 text-[11px] text-foreground"><code>{change.content}</code></pre>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="flex items-center justify-end gap-2 border-t border-[hsl(240,5%,14%)] px-4 py-3">
              <button
                onClick={() => setReviewTarget(null)}
                className="rounded-md border border-[hsl(240,5%,16%)] px-3 py-1.5 text-xs text-muted-foreground hover:text-foreground"
              >
                Cancel
              </button>
              <button
                onClick={applyReviewedChanges}
                className="rounded-md border border-primary/40 bg-primary/20 px-3 py-1.5 text-xs text-primary hover:bg-primary/30"
              >
                Confirm apply
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
