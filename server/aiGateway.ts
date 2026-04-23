import { generateWithGemini } from "./gemini";
import { storage } from "./storage";

type ChatRole = "user" | "assistant";

type ChatMessage = {
  role: ChatRole;
  content: string;
};

type GenerateWithFailoverInput = {
  model: string;
  username: string;
  userId?: string;
  projectId?: string;
  learningMode?: boolean;
  outputLanguage?: "en" | "bn";
  maxTokens?: number;
  history: ChatMessage[];
};

type ProviderResult = {
  text: string;
  provider: "ollama" | "gemini" | "anthropic" | "openai" | "groq" | "perplexity";
  model: string;
};

type ProviderStreamResult = {
  provider: "ollama" | "gemini" | "anthropic" | "openai" | "groq" | "perplexity";
  model: string;
  stream: AsyncGenerator<string, void, void>;
};

const DEFAULT_SYSTEM_PROMPT =
  "You are Synapse AI, a concise coding assistant. Give actionable, implementation-focused responses. " +
  "When code changes span multiple files, respond with a JSON block in this format: " +
  '{ "files": [ { "path": "src/App.tsx", "content": "..." }, ... ] } ' +
  "Always wrap this in a ```json block. Plain prose explanations go outside the block. " +
  "Never repeat unchanged code. When editing a file, output only a unified diff in ```diff format. " +
  "Use +/- line markers. Include 3 lines of context around each change. Do not output the entire file.";

const BANGLA_SYSTEM_PREFIX =
  "You are a Bengali-speaking assistant. All explanations, descriptions, error messages, and conversational text must be written in Bengali (বাংলা). " +
  "All code, variable names, file paths, and technical identifiers must remain in English. " +
  "Never translate code syntax or identifiers into Bengali.";

function buildSystemPrompt(
  username: string,
  outputLanguage: "en" | "bn" = "en",
  projectContextLine = "",
): string {
  const prefix = outputLanguage === "bn" ? `${BANGLA_SYSTEM_PREFIX} ` : "";
  const contextPrefix = projectContextLine ? `${projectContextLine} ` : "";
  return `${prefix}${contextPrefix}${DEFAULT_SYSTEM_PROMPT} You are helping ${username} build web apps.`;
}

async function getProjectContextLine(userId?: string, projectId?: string, learningMode?: boolean): Promise<string> {
  if (!learningMode || !userId || !projectId) {
    return "";
  }

  const insightEntry = await storage.getProjectInsights(userId, projectId);
  if (!insightEntry || insightEntry.insights.length === 0) {
    return "";
  }

  let stack = "";
  let conventions = "";
  let structure = "";

  for (const insight of insightEntry.insights) {
    const [rawKey, ...rest] = insight.split(":");
    const key = rawKey.trim().toLowerCase();
    const value = rest.join(":").trim();
    if (!value) {
      continue;
    }

    if (key === "stack") {
      stack = value;
    } else if (key === "conventions") {
      conventions = value;
    } else if (key === "structure") {
      structure = value;
    }
  }

  if (!stack && !conventions && !structure) {
    return "";
  }

  return `Project context from prior work: ${stack || "n/a"}, ${conventions || "n/a"}, ${structure || "n/a"}. Respect these patterns in all suggestions.`;
}

function getEnv(...keys: string[]): string | undefined {
  for (const key of keys) {
    const value = process.env[key]?.trim();
    if (value) {
      return value;
    }
  }
  return undefined;
}

function normalizeModelHint(input: string): string {
  return (input || "").trim().toLowerCase();
}

function resolveGeminiModel(requestedModel: string): string {
  const hint = normalizeModelHint(requestedModel);
  if (!hint) {
    return "gemini-2.5-flash";
  }

  if (hint.includes("gemini-2.5-pro")) {
    return "gemini-2.5-pro";
  }

  if (hint.includes("gemini-2.5-flash-lite") || hint.includes("flash-lite")) {
    return "gemini-2.5-flash-lite";
  }

  if (hint.includes("gemini") || hint.includes("flash") || hint.includes("google")) {
    return "gemini-2.5-flash";
  }

  // If a non-Gemini family is requested (e.g., gpt-4o), avoid sending invalid model IDs to Gemini API.
  return "gemini-2.5-flash";
}

function toOpenAIMessages(
  username: string,
  history: ChatMessage[],
  outputLanguage: "en" | "bn" = "en",
  projectContextLine = "",
) {
  return [
    {
      role: "system",
      content: buildSystemPrompt(username, outputLanguage, projectContextLine),
    },
    ...history
      .filter((entry) => entry.content.trim().length > 0)
      .slice(-12)
      .map((entry) => ({
        role: entry.role === "assistant" ? "assistant" : "user",
        content: entry.content,
      })),
  ];
}

async function* readSseDataLines(response: Response): AsyncGenerator<string, void, void> {
  if (!response.body) {
    return;
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  const flushEvents = function* (rawChunk: string): Generator<string, void, void> {
    const events = rawChunk.split(/\r?\n\r?\n/);
    for (let i = 0; i < events.length - 1; i += 1) {
      const rawEvent = events[i];
      const lines = rawEvent.split(/\r?\n/);
      for (const rawLine of lines) {
        const line = rawLine.trimStart();
        if (!line.startsWith("data:")) {
          continue;
        }

        const payload = line.slice(5).trim();
        if (!payload || payload === "[DONE]") {
          continue;
        }

        yield payload;
      }
    }
  };

  while (true) {
    const { value, done } = await reader.read();
    if (done) {
      break;
    }

    buffer += decoder.decode(value, { stream: true });
    const parts = buffer.split(/\r?\n\r?\n/);
    buffer = parts.pop() || "";
    const processed = parts.join("\n\n");
    for (const payload of Array.from(flushEvents(`${processed}\n\n`))) {
      yield payload;
    }
  }

  // Flush any trailing event that may not end with a double newline.
  if (buffer.trim().length > 0) {
    const lines = buffer.split(/\r?\n/);
    for (const rawLine of lines) {
      const line = rawLine.trimStart();
      if (!line.startsWith("data:")) {
        continue;
      }

      const payload = line.slice(5).trim();
      if (!payload || payload === "[DONE]") {
        continue;
      }

      yield payload;
    }
  }
}

function normalizeOpenAIModel(requestedModel: string): string {
  const hint = normalizeModelHint(requestedModel);
  if (!hint) {
    return "gpt-4o-mini";
  }

  if (hint.includes("gpt")) {
    return requestedModel;
  }

  return "gpt-4o-mini";
}

function normalizeGroqModel(requestedModel: string): string {
  const hint = normalizeModelHint(requestedModel);
  if (!hint) {
    return "llama-3.1-8b-instant";
  }

  if (hint.includes("llama") || hint.includes("mixtral") || hint.includes("groq")) {
    return requestedModel;
  }

  return "llama-3.1-8b-instant";
}

function normalizePerplexityModel(requestedModel: string): string {
  const hint = normalizeModelHint(requestedModel);
  if (!hint) {
    return "sonar";
  }

  if (hint.includes("sonar") || hint.includes("perplexity")) {
    return requestedModel;
  }

  return "sonar";
}

async function* streamAsTokenChunks(text: string): AsyncGenerator<string, void, void> {
  const normalized = text.trim();
  if (!normalized) {
    return;
  }

  const chunks = normalized.match(/.{1,64}(\s|$)/g) || [normalized];
  for (const chunk of chunks) {
    yield chunk;
  }
}

async function tryGeminiStream(
  model: string,
  username: string,
  outputLanguage: "en" | "bn",
  projectContextLine: string,
  history: ChatMessage[],
): Promise<ProviderStreamResult> {
  const apiKey = getEnv("GEMINI_API_KEY");
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY missing");
  }

  const resolvedModel = resolveGeminiModel(model);

  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(resolvedModel)}:streamGenerateContent?alt=sse`;
  const contents = history
    .filter((entry) => entry.content.trim().length > 0)
    .slice(-12)
    .map((entry) => ({
      role: entry.role === "assistant" ? "model" : "user",
      parts: [{ text: entry.content }],
    }));

  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-goog-api-key": apiKey,
    },
    body: JSON.stringify({
      systemInstruction: {
        parts: [
          {
            text: buildSystemPrompt(username, outputLanguage, projectContextLine),
          },
        ],
      },
      contents,
    }),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Gemini stream failed: ${text || response.statusText}`);
  }

  async function* tokenStream() {
    for await (const dataLine of readSseDataLines(response)) {
      try {
        const payload = JSON.parse(dataLine) as {
          candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
        };

        const text = payload.candidates?.[0]?.content?.parts
          ?.map((part) => part.text || "")
          .join("")
          .trim();

        if (text) {
          yield text;
        }
      } catch {
        // Ignore malformed stream chunk.
      }
    }
  }

  return {
    provider: "gemini",
    model: resolvedModel,
    stream: tokenStream(),
  };
}

async function tryAnthropicStream(
  username: string,
  outputLanguage: "en" | "bn",
  projectContextLine: string,
  history: ChatMessage[],
): Promise<ProviderStreamResult> {
  const apiKey = getEnv("ANTHROPIC_API_KEY", "CLAUDE_API_KEY");
  if (!apiKey) {
    throw new Error("ANTHROPIC_API_KEY missing");
  }

  const model = "claude-3-5-sonnet-20241022";
  const messages = history
    .filter((entry) => entry.content.trim().length > 0)
    .slice(-12)
    .map((entry) => ({
      role: entry.role === "assistant" ? "assistant" : "user",
      content: entry.content,
    }));

  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model,
      max_tokens: 1024,
      stream: true,
      system: buildSystemPrompt(username, outputLanguage, projectContextLine),
      messages,
    }),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Anthropic stream failed: ${text || response.statusText}`);
  }

  async function* tokenStream() {
    for await (const dataLine of readSseDataLines(response)) {
      try {
        const payload = JSON.parse(dataLine) as {
          type?: string;
          delta?: { text?: string };
        };

        if (payload.type === "content_block_delta" && payload.delta?.text) {
          yield payload.delta.text;
        }
      } catch {
        // Ignore malformed stream chunk.
      }
    }
  }

  return {
    provider: "anthropic",
    model,
    stream: tokenStream(),
  };
}

async function tryOpenAICompatibleStream(
  provider: "openai" | "groq" | "perplexity",
  endpoint: string,
  apiKey: string,
  model: string,
  username: string,
  outputLanguage: "en" | "bn",
  projectContextLine: string,
  history: ChatMessage[],
): Promise<ProviderStreamResult> {
  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      stream: true,
      temperature: 0.2,
      messages: toOpenAIMessages(username, history, outputLanguage, projectContextLine),
    }),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`${provider} stream failed: ${text || response.statusText}`);
  }

  async function* tokenStream() {
    for await (const dataLine of readSseDataLines(response)) {
      try {
        const payload = JSON.parse(dataLine) as {
          choices?: Array<{ delta?: { content?: string }; message?: { content?: string } }>;
        };

        const token = payload.choices?.[0]?.delta?.content
          || payload.choices?.[0]?.message?.content
          || "";

        if (token) {
          yield token;
        }
      } catch {
        // Ignore malformed stream chunk.
      }
    }
  }

  return {
    provider,
    model,
    stream: tokenStream(),
  };
}

async function tryOpenAIStream(
  model: string,
  username: string,
  outputLanguage: "en" | "bn",
  projectContextLine: string,
  history: ChatMessage[],
): Promise<ProviderStreamResult> {
  const apiKey = getEnv("OPENAI_API_KEY", "OPEN_API_KEY");
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY missing");
  }

  return tryOpenAICompatibleStream(
    "openai",
    "https://api.openai.com/v1/chat/completions",
    apiKey,
    normalizeOpenAIModel(model),
    username,
    outputLanguage,
    projectContextLine,
    history,
  );
}

async function tryGroqStream(
  model: string,
  username: string,
  outputLanguage: "en" | "bn",
  projectContextLine: string,
  history: ChatMessage[],
): Promise<ProviderStreamResult> {
  const apiKey = getEnv("GROQ_API_KEY");
  if (!apiKey) {
    throw new Error("GROQ_API_KEY missing");
  }

  return tryOpenAICompatibleStream(
    "groq",
    "https://api.groq.com/openai/v1/chat/completions",
    apiKey,
    normalizeGroqModel(model),
    username,
    outputLanguage,
    projectContextLine,
    history,
  );
}

async function tryPerplexityStream(
  model: string,
  username: string,
  outputLanguage: "en" | "bn",
  projectContextLine: string,
  history: ChatMessage[],
): Promise<ProviderStreamResult> {
  const apiKey = getEnv("PERPLEXITY_API_KEY", "PPLX_API_KEY");
  if (!apiKey) {
    throw new Error("PERPLEXITY_API_KEY missing");
  }

  return tryOpenAICompatibleStream(
    "perplexity",
    "https://api.perplexity.ai/chat/completions",
    apiKey,
    normalizePerplexityModel(model),
    username,
    outputLanguage,
    projectContextLine,
    history,
  );
}

async function tryOllamaStream(
  model: string,
  username: string,
  outputLanguage: "en" | "bn",
  projectContextLine: string,
  history: ChatMessage[],
): Promise<ProviderStreamResult> {
  const apiUrl = getEnv("OLLAMA_API_URL") || "http://localhost:11434";
  const ollamaModel = getEnv("OLLAMA_MODEL") || "qwen2.5-coder:1.5b";

  const response = await fetch(`${apiUrl}/api/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: ollamaModel,
      stream: true,
      messages: toOpenAIMessages(username, history, outputLanguage, projectContextLine),
    }),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Ollama stream failed: ${text || response.statusText}`);
  }

  async function* tokenStream() {
    if (!response.body) return;
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";

    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });

      const lines = buffer.split("\n");
      buffer = lines.pop() || "";

      for (const line of lines) {
        if (!line.trim()) continue;
        try {
          const payload = JSON.parse(line) as { message?: { content?: string } };
          if (payload.message?.content) {
            yield payload.message.content;
          }
        } catch {
          // Ignore malformed JSON
        }
      }
    }
  }

  return {
    provider: "ollama",
    model: ollamaModel,
    stream: tokenStream(),
  };
}

async function tryAnthropic(
  username: string,
  outputLanguage: "en" | "bn",
  projectContextLine: string,
  maxTokens: number,
  history: ChatMessage[],
): Promise<ProviderResult> {
  const apiKey = getEnv("ANTHROPIC_API_KEY", "CLAUDE_API_KEY");
  if (!apiKey) {
    throw new Error("ANTHROPIC_API_KEY missing");
  }

  const model = "claude-3-5-sonnet-20241022";
  const messages = history
    .filter((entry) => entry.content.trim().length > 0)
    .slice(-12)
    .map((entry) => ({
      role: entry.role === "assistant" ? "assistant" : "user",
      content: entry.content,
    }));

  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model,
      max_tokens: maxTokens,
      system: buildSystemPrompt(username, outputLanguage, projectContextLine),
      messages,
    }),
  });

  const payload = await response.json() as {
    content?: Array<{ type?: string; text?: string }>;
    error?: { message?: string };
  };

  if (!response.ok) {
    throw new Error(payload.error?.message || "Anthropic request failed");
  }

  const text = (payload.content || [])
    .filter((part) => part.type === "text")
    .map((part) => part.text || "")
    .join("\n")
    .trim();

  if (!text) {
    throw new Error("Anthropic returned empty response");
  }

  return { text, provider: "anthropic", model };
}

async function tryOpenAICompatible(
  provider: "openai" | "groq" | "perplexity",
  endpoint: string,
  apiKey: string,
  model: string,
  username: string,
  outputLanguage: "en" | "bn",
  projectContextLine: string,
  maxTokens: number,
  history: ChatMessage[],
): Promise<ProviderResult> {
  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages: toOpenAIMessages(username, history, outputLanguage, projectContextLine),
      temperature: 0.2,
      max_tokens: maxTokens,
    }),
  });

  const payload = await response.json() as {
    choices?: Array<{ message?: { content?: string } }>;
    error?: { message?: string };
  };

  if (!response.ok) {
    throw new Error(payload.error?.message || `${provider} request failed`);
  }

  const text = payload.choices?.[0]?.message?.content?.trim();
  if (!text) {
    throw new Error(`${provider} returned empty response`);
  }

  return { text, provider, model };
}

async function tryOpenAI(
  username: string,
  outputLanguage: "en" | "bn",
  projectContextLine: string,
  maxTokens: number,
  history: ChatMessage[],
): Promise<ProviderResult> {
  const apiKey = getEnv("OPENAI_API_KEY", "OPEN_API_KEY");
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY missing");
  }

  return tryOpenAICompatible(
    "openai",
    "https://api.openai.com/v1/chat/completions",
    apiKey,
    "gpt-4o-mini",
    username,
    outputLanguage,
    projectContextLine,
    maxTokens,
    history,
  );
}

async function tryGroq(
  username: string,
  outputLanguage: "en" | "bn",
  projectContextLine: string,
  maxTokens: number,
  history: ChatMessage[],
): Promise<ProviderResult> {
  const apiKey = getEnv("GROQ_API_KEY");
  if (!apiKey) {
    throw new Error("GROQ_API_KEY missing");
  }

  return tryOpenAICompatible(
    "groq",
    "https://api.groq.com/openai/v1/chat/completions",
    apiKey,
    "llama-3.1-8b-instant",
    username,
    outputLanguage,
    projectContextLine,
    maxTokens,
    history,
  );
}

async function tryPerplexity(
  username: string,
  outputLanguage: "en" | "bn",
  projectContextLine: string,
  maxTokens: number,
  history: ChatMessage[],
): Promise<ProviderResult> {
  const apiKey = getEnv("PERPLEXITY_API_KEY", "PPLX_API_KEY");
  if (!apiKey) {
    throw new Error("PERPLEXITY_API_KEY missing");
  }

  return tryOpenAICompatible(
    "perplexity",
    "https://api.perplexity.ai/chat/completions",
    apiKey,
    "sonar",
    username,
    outputLanguage,
    projectContextLine,
    maxTokens,
    history,
  );
}

async function tryOllama(
  username: string,
  outputLanguage: "en" | "bn",
  projectContextLine: string,
  maxTokens: number,
  history: ChatMessage[],
): Promise<ProviderResult> {
  const apiUrl = getEnv("OLLAMA_API_URL") || "http://localhost:11434";
  const ollamaModel = getEnv("OLLAMA_MODEL") || "qwen2.5-coder:1.5b";

  const response = await fetch(`${apiUrl}/api/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: ollamaModel,
      stream: false,
      messages: toOpenAIMessages(username, history, outputLanguage, projectContextLine),
    }),
  });

  const payload = await response.json() as { message?: { content?: string }; error?: { message?: string } };

  if (!response.ok) {
    throw new Error(payload.error?.message || "Ollama request failed");
  }

  const text = payload.message?.content?.trim();
  if (!text) {
    throw new Error("Ollama returned empty response");
  }

  return { text, provider: "ollama", model: ollamaModel };
}

async function tryGemini(
  model: string,
  username: string,
  outputLanguage: "en" | "bn",
  projectContextLine: string,
  history: ChatMessage[],
): Promise<ProviderResult> {
  const resolvedModel = resolveGeminiModel(model);
  const text = await generateWithGemini({
    model: resolvedModel,
    username,
    outputLanguage,
    projectContextLine,
    history,
  });

  return {
    text,
    provider: "gemini",
    model: resolvedModel,
  };
}

export async function generateWithFailover({
  model,
  username,
  userId,
  projectId,
  learningMode = false,
  outputLanguage = "en",
  maxTokens = 1024,
  history,
}: GenerateWithFailoverInput): Promise<ProviderResult> {
  const projectContextLine = await getProjectContextLine(userId, projectId, learningMode);
  const hint = normalizeModelHint(model);
  const attempts: Array<() => Promise<ProviderResult>> = [];

  // PRIORITY 1: Try local Ollama first (fastest, no API keys needed)
  attempts.push(() => tryOllama(username, outputLanguage, projectContextLine, maxTokens, history));

  // If the UI explicitly asks for a family, prioritize it next.
  if (hint.includes("claude") || hint.includes("anthropic")) {
    attempts.push(() => tryAnthropic(username, outputLanguage, projectContextLine, maxTokens, history));
  } else if (hint.includes("gpt") || hint.includes("openai")) {
    attempts.push(() => tryOpenAI(username, outputLanguage, projectContextLine, maxTokens, history));
  } else if (hint.includes("groq") || hint.includes("llama")) {
    attempts.push(() => tryGroq(username, outputLanguage, projectContextLine, maxTokens, history));
  } else if (hint.includes("perplexity") || hint.includes("sonar")) {
    attempts.push(() => tryPerplexity(username, outputLanguage, projectContextLine, maxTokens, history));
  } else {
    attempts.push(() => tryGemini(resolveGeminiModel(model), username, outputLanguage, projectContextLine, history));
  }

  // Global fallback chain for high availability.
  attempts.push(
    () => tryGemini(resolveGeminiModel(model), username, outputLanguage, projectContextLine, history),
    () => tryAnthropic(username, outputLanguage, projectContextLine, maxTokens, history),
    () => tryOpenAI(username, outputLanguage, projectContextLine, maxTokens, history),
    () => tryGroq(username, outputLanguage, projectContextLine, maxTokens, history),
    () => tryPerplexity(username, outputLanguage, projectContextLine, maxTokens, history),
  );

  const seen = new Set<string>();
  const uniqueAttempts = attempts.filter((fn) => {
    const key = fn.toString();
    if (seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  });

  const errors: string[] = [];
  for (const attempt of uniqueAttempts) {
    try {
      return await attempt();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown provider error";
      errors.push(message);
    }
  }

  throw new Error(`All AI providers failed: ${errors.join(" | ")}`);
}

export async function generateWithFailoverStream({
  model,
  username,
  userId,
  projectId,
  learningMode = false,
  outputLanguage = "en",
  history,
}: GenerateWithFailoverInput): Promise<ProviderStreamResult> {
  const projectContextLine = await getProjectContextLine(userId, projectId, learningMode);
  const hint = normalizeModelHint(model);
  const attempts: Array<() => Promise<ProviderStreamResult>> = [];

  // PRIORITY 1: Try local Ollama first (fastest, no API keys needed)
  attempts.push(() => tryOllamaStream(model, username, outputLanguage, projectContextLine, history));

  if (hint.includes("claude") || hint.includes("anthropic")) {
    attempts.push(() => tryAnthropicStream(username, outputLanguage, projectContextLine, history));
  } else if (hint.includes("gpt") || hint.includes("openai")) {
    attempts.push(() => tryOpenAIStream(model, username, outputLanguage, projectContextLine, history));
  } else if (hint.includes("groq") || hint.includes("llama") || hint.includes("mixtral")) {
    attempts.push(() => tryGroqStream(model, username, outputLanguage, projectContextLine, history));
  } else if (hint.includes("perplexity") || hint.includes("sonar")) {
    attempts.push(() => tryPerplexityStream(model, username, outputLanguage, projectContextLine, history));
  } else {
    attempts.push(() => tryGeminiStream(resolveGeminiModel(model), username, outputLanguage, projectContextLine, history));
  }

  // Try all providers in a deterministic fallback order.
  attempts.push(
    () => tryGeminiStream(resolveGeminiModel(model), username, outputLanguage, projectContextLine, history),
    () => tryAnthropicStream(username, outputLanguage, projectContextLine, history),
    () => tryOpenAIStream(model, username, outputLanguage, projectContextLine, history),
    () => tryGroqStream(model, username, outputLanguage, projectContextLine, history),
    () => tryPerplexityStream(model, username, outputLanguage, projectContextLine, history),
  );

  const errors: string[] = [];
  for (const attempt of attempts) {
    try {
      return await attempt();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown provider stream error";
      errors.push(message);
    }
  }

  // Final guarantee: never hard-fail chat streaming. Fall back to non-stream providers,
  // then to a deterministic local assistant message.
  try {
    const fallbackResult = await generateWithFailover({
      model,
      username,
      userId,
      projectId,
      learningMode,
      outputLanguage,
      maxTokens: 700,
      history,
    });

    return {
      provider: fallbackResult.provider,
      model: fallbackResult.model,
      stream: streamAsTokenChunks(fallbackResult.text),
    };
  } catch (finalError) {
    const finalMessage = finalError instanceof Error ? finalError.message : "unknown error";
    const safeText = outputLanguage === "bn"
      ? "এই মুহূর্তে সব AI প্রোভাইডার অনুপলব্ধ। আমি আপনার অনুরোধ রেকর্ড করেছি। অনুগ্রহ করে আবার চেষ্টা করুন, অথবা ছোট/নির্দিষ্ট প্রম্পট দিন।"
      : "All AI providers are currently unavailable. I captured your request. Please retry, or send a shorter/more specific prompt.";

    const errorTrail = [...errors, finalMessage].join(" | ");
    const combined = `${safeText}\n\n[Provider diagnostics] ${errorTrail}`;

    return {
      provider: "gemini",
      model: "local-fallback",
      stream: streamAsTokenChunks(combined),
    };
  }
}
