type GeminiRole = "user" | "assistant";

type GeminiHistoryMessage = {
  role: GeminiRole;
  content: string;
};

type GenerateWithGeminiInput = {
  model: string;
  username: string;
  outputLanguage?: "en" | "bn";
  projectContextLine?: string;
  history: GeminiHistoryMessage[];
};

type GeminiGenerateContentResponse = {
  candidates?: Array<{
    content?: {
      parts?: Array<{
        text?: string;
      }>;
    };
    finishReason?: string;
  }>;
  promptFeedback?: {
    blockReason?: string;
  };
  error?: {
    message?: string;
  };
};

type GeminiListModelsResponse = {
  models?: Array<{
    name?: string;
    supportedGenerationMethods?: string[];
  }>;
  error?: {
    message?: string;
  };
};

const MODEL_CACHE_TTL_MS = 5 * 60 * 1000;
let modelCache: { fetchedAt: number; models: string[] } | null = null;

const MODEL_FALLBACK_ORDER = [
  "gemini-2.5-flash",
  "gemini-1.5-flash",
  "gemini-1.5-flash-latest",
  "gemini-1.5-pro",
  "gemini-pro",
];

function toGeminiRole(role: GeminiRole): "user" | "model" {
  return role === "assistant" ? "model" : "user";
}

function normalizeModelName(name: string): string {
  return name.replace(/^models\//, "").trim();
}

function isModelNotSupportedError(message: string): boolean {
  const lower = message.toLowerCase();
  return (
    lower.includes("not found") ||
    lower.includes("not supported for generatecontent") ||
    lower.includes("unsupported")
  );
}

function isModelQuotaOrRateError(message: string): boolean {
  const lower = message.toLowerCase();
  return (
    lower.includes("exceeded your current quota") ||
    lower.includes("quota exceeded") ||
    lower.includes("rate limit") ||
    lower.includes("retry in")
  );
}

async function listGenerateContentModels(apiKey: string): Promise<string[]> {
  if (modelCache && Date.now() - modelCache.fetchedAt < MODEL_CACHE_TTL_MS) {
    return modelCache.models;
  }

  const response = await fetch("https://generativelanguage.googleapis.com/v1beta/models", {
    method: "GET",
    headers: {
      "X-goog-api-key": apiKey,
    },
  });

  const payload = (await response.json()) as GeminiListModelsResponse;
  if (!response.ok) {
    const providerMessage = payload.error?.message || "Unknown Gemini API error";
    throw new Error(`Gemini list models failed: ${providerMessage}`);
  }

  const models = (payload.models || [])
    .filter((item) => item.supportedGenerationMethods?.includes("generateContent"))
    .map((item) => normalizeModelName(item.name || ""))
    .filter((name) => name.length > 0);

  modelCache = {
    fetchedAt: Date.now(),
    models,
  };

  return models;
}

function buildModelAttemptOrder(requestedModel: string, availableModels: string[]): string[] {
  const normalizedRequested = normalizeModelName(requestedModel);
  const attempts: string[] = [normalizedRequested, ...MODEL_FALLBACK_ORDER, ...availableModels];

  const unique = new Set<string>();
  const ordered: string[] = [];
  for (const candidate of attempts) {
    const normalized = normalizeModelName(candidate);
    if (!normalized || unique.has(normalized)) {
      continue;
    }
    unique.add(normalized);
    ordered.push(normalized);
  }

  return ordered;
}

export async function generateWithGemini({
  model,
  username,
  outputLanguage = "en",
  projectContextLine = "",
  history,
}: GenerateWithGeminiInput): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is not configured on the server");
  }

  const contents = history
    .filter((entry) => entry.content.trim().length > 0)
    .slice(-12)
    .map((entry) => ({
      role: toGeminiRole(entry.role),
      parts: [{ text: entry.content }],
    }));

  const languagePrefix = outputLanguage === "bn"
    ? "You are a Bengali-speaking assistant. All explanations, descriptions, error messages, and conversational text must be written in Bengali (বাংলা). All code, variable names, file paths, and technical identifiers must remain in English. Never translate code syntax or identifiers into Bengali. "
    : "";

  const contextPrefix = projectContextLine ? `${projectContextLine} ` : "";
  const systemPrompt = `${languagePrefix}${contextPrefix}You are Synapse AI, a concise coding assistant helping ${username} build web apps. Give actionable, implementation-focused responses. When code changes span multiple files, respond with a JSON block in this format: { "files": [ { "path": "src/App.tsx", "content": "..." }, ... ] }. Always wrap this in a \`\`\`json block. Plain prose explanations go outside the block. Never repeat unchanged code. When editing a file, output only a unified diff in \`\`\`diff format. Use +/- line markers. Include 3 lines of context around each change. Do not output the entire file.`;

  let availableModels: string[] = [];
  try {
    availableModels = await listGenerateContentModels(apiKey);
  } catch {
    // Continue with fallback order if listing models fails.
  }

  const attemptModels = buildModelAttemptOrder(model, availableModels).slice(0, 8);
  let lastError = "Unknown Gemini API error";
  const attemptErrors: string[] = [];

  for (const attemptModel of attemptModels) {
    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(attemptModel)}:generateContent`;

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
              text: `You are Synapse AI, a concise coding assistant helping ${username} build web apps. Give actionable, implementation-focused responses. When code changes span multiple files, respond with a JSON block in this format: { "files": [ { "path": "src/App.tsx", "content": "..." }, ... ] }. Always wrap this in a \`\`\`json block. Plain prose explanations go outside the block. Never repeat unchanged code. When editing a file, output only a unified diff in \`\`\`diff format. Use +/- line markers. Include 3 lines of context around each change. Do not output the entire file.`,
            },
          ],
        },
        contents,
      }),
    });

    const payload = (await response.json()) as GeminiGenerateContentResponse;

    if (!response.ok) {
      const providerMessage = payload.error?.message || "Unknown Gemini API error";
      lastError = providerMessage;
      attemptErrors.push(`${attemptModel}: ${providerMessage}`);

      if (isModelNotSupportedError(providerMessage) || isModelQuotaOrRateError(providerMessage)) {
        continue;
      }

      throw new Error(`Gemini request failed: ${providerMessage}`);
    }

    if (payload.promptFeedback?.blockReason) {
      throw new Error(`Gemini blocked the prompt: ${payload.promptFeedback.blockReason}`);
    }

    const text = payload.candidates?.[0]?.content?.parts
      ?.map((part) => part.text || "")
      .join("\n")
      .trim();

    if (!text) {
      const reason = payload.candidates?.[0]?.finishReason || "no-content";
      throw new Error(`Gemini returned an empty response (${reason})`);
    }

    return text;
  }

  const detail = attemptErrors.length > 0
    ? ` Attempted models: ${attemptErrors.join(" | ")}`
    : "";
  throw new Error(`Gemini request failed: ${lastError}.${detail}`);
}
