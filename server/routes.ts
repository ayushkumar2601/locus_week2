import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { scryptSync, randomBytes, timingSafeEqual } from "crypto";
import { z } from "zod";
import { storage } from "./storage";
import { generateWithFailover, generateWithFailoverStream } from "./aiGateway";
import { assertSupabaseConfigured, supabase } from "./supabase";

const authSchema = z
  .object({
    username: z.string().trim().min(3).max(160).optional(),
    email: z.string().trim().min(3).max(254).optional(),
    password: z.string().min(8).max(256),
  })
  .superRefine((value, ctx) => {
    if (!value.username && !value.email) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["username"],
        message: "Username or email is required",
      });
    }
  })
  .transform((value) => ({
    username: (value.username || value.email || "").trim(),
    password: value.password,
  }));

const forgotPasswordSchema = z
  .object({
    username: z.string().trim().min(3).max(160).optional(),
    email: z.string().trim().min(3).max(254).optional(),
    newPassword: z.string().min(8).max(256),
  })
  .superRefine((value, ctx) => {
    if (!value.username && !value.email) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["username"],
        message: "Username or email is required",
      });
    }
  })
  .transform((value) => ({
    username: (value.username || value.email || "").trim(),
    newPassword: value.newPassword,
  }));

const socialSigninSchema = z.object({
  provider: z.enum(["google", "github"]),
  deviceId: z.string().trim().min(8).max(120),
});

const chatSchema = z.object({
  message: z.string().trim().min(1).max(4000),
  model: z.string().trim().min(1).max(100).optional(),
  outputLanguage: z.enum(["en", "bn"]).default("en"),
  projectId: z.string().uuid().optional(),
  learningMode: z.boolean().default(false),
});

const creditPurchaseSchema = z.object({
  credits: z.number().int().positive().max(100000),
  amountUsd: z.number().positive().max(1000000),
  paymentMethod: z.string().trim().min(2).max(60).optional(),
  paymentRef: z.string().trim().max(120).optional(),
});

const chatSuggestSchema = z.object({
  history: z.array(z.object({
    role: z.enum(["user", "assistant"]),
    content: z.string().trim().min(1).max(2000),
  })).max(6),
  currentFile: z.string().trim().max(300).optional(),
  model: z.string().trim().min(1).max(100).optional(),
});

const chatwootConfigureSchema = z.object({
  websiteToken: z.string().trim().min(1).max(300),
  chatwootUrl: z.string().trim().min(1).max(500),
  projectId: z.string().uuid(),
});

type SuggestionCacheEntry = {
  expiresAt: number;
  suggestions: string[];
};

type ProjectPatternSummary = {
  stack: string;
  conventions: string;
  structure: string;
  utilities: string;
};

type CompetitiveAnalysis = {
  proposition: string;
  strengths: string[];
  weaknesses: string[];
  gaps: string[];
  improvements: string[];
};

type ParsedMultipartForm = {
  fields: Record<string, string>;
  file?: {
    filename: string;
    mimeType: string;
    content: Buffer;
  };
};

const suggestionCache = new Map<string, SuggestionCacheEntry>();

type EditorChange = {
  path: string;
  language: "typescript" | "css" | "json" | "markdown";
  content: string;
  action: "create" | "update";
};

function toPascalCase(input: string): string {
  const words = input
    .replace(/[^a-zA-Z0-9\s]/g, " ")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 4);

  if (words.length === 0) {
    return "GeneratedSection";
  }

  return words
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join("");
}

function inferLanguage(path: string): EditorChange["language"] {
  const lower = path.toLowerCase();
  if (lower.endsWith(".css")) {
    return "css";
  }
  if (lower.endsWith(".json")) {
    return "json";
  }
  if (lower.endsWith(".md") || lower.endsWith(".markdown")) {
    return "markdown";
  }
  return "typescript";
}

function extractEditorChangesFromJsonBlocks(aiText: string): EditorChange[] {
  const blockRegex = /```json\s*([\s\S]*?)```/gi;
  const parsedChanges: EditorChange[] = [];

  for (const match of Array.from(aiText.matchAll(blockRegex))) {
    const jsonText = match[1]?.trim();
    if (!jsonText) {
      continue;
    }

    try {
      const parsed = JSON.parse(jsonText) as {
        files?: Array<{ path?: unknown; content?: unknown }>;
      };

      if (!Array.isArray(parsed.files)) {
        continue;
      }

      for (const file of parsed.files) {
        if (typeof file.path !== "string" || typeof file.content !== "string") {
          continue;
        }

        const normalizedPath = file.path.trim().replace(/\\/g, "/");
        if (!normalizedPath) {
          continue;
        }

        parsedChanges.push({
          path: normalizedPath,
          content: file.content,
          language: inferLanguage(normalizedPath),
          action: "update",
        });
      }
    } catch {
      // Ignore malformed JSON blocks and continue parsing remaining blocks.
    }
  }

  const dedupedByPath = new Map<string, EditorChange>();
  for (const change of parsedChanges) {
    dedupedByPath.set(change.path, change);
  }

  return Array.from(dedupedByPath.values());
}

function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

function verifyPassword(password: string, storedHash: string) {
  const [salt, key] = storedHash.split(":");
  if (!salt || !key) {
    return false;
  }

  const attemptedKey = scryptSync(password, salt, 64);
  const storedKey = Buffer.from(key, "hex");

  if (attemptedKey.length !== storedKey.length) {
    return false;
  }

  return timingSafeEqual(attemptedKey, storedKey);
}

async function ensureSupabaseUserAndDefaultSubscription(user: {
  id: string;
  username: string;
  password: string;
}) {
  try {
    assertSupabaseConfigured();
  } catch {
    return;
  }

  const derivedEmail = user.username.includes("@")
    ? user.username
    : `${user.username}@synapse.local`;

  await supabase
    .from("users")
    .upsert(
      {
        id: user.id,
        email: derivedEmail,
        username: user.username,
        password_hash: user.password,
        is_active: true,
        is_suspended: false,
      },
      { onConflict: "id" },
    );

  const freePlanRes = await supabase
    .from("subscription_plans")
    .select("id")
    .eq("name", "free")
    .maybeSingle();

  if (freePlanRes.error || !freePlanRes.data?.id) {
    return;
  }

  await supabase
    .from("user_subscriptions")
    .upsert(
      {
        user_id: user.id,
        plan_id: freePlanRes.data.id,
        status: "active",
        started_at: new Date().toISOString(),
        ai_calls_used: 0,
      },
      { onConflict: "user_id" },
    );
}

async function logSystemUserAction(
  action: string,
  userId: string,
  details: Record<string, unknown> = {},
) {
  try {
    assertSupabaseConfigured();
  } catch {
    return;
  }

  await supabase.from("admin_audit_log").insert({
    admin_email: "system@synapse.local",
    action,
    target_user_id: userId,
    details,
  });
}

function normalizeChatwootBaseUrl(input: string): string {
  const trimmed = input.trim();
  const withProtocol = /^https?:\/\//i.test(trimmed)
    ? trimmed
    : `https://${trimmed}`;
  const parsed = new URL(withProtocol);
  if (!parsed.hostname) {
    throw new Error("Invalid Chatwoot URL");
  }
  if (!['http:', 'https:'].includes(parsed.protocol)) {
    throw new Error("Chatwoot URL must be HTTP/HTTPS");
  }
  parsed.hash = "";
  parsed.search = "";
  return parsed.toString().replace(/\/+$/, "");
}

function isMissingSupabaseRelation(error: { message?: string } | null | undefined): boolean {
  const message = (error?.message || "").toLowerCase();
  if (!message) {
    return false;
  }

  return (
    message.includes("schema cache") ||
    message.includes("could not find the table") ||
    (message.includes("relation") && message.includes("does not exist"))
  );
}

function extractBearerToken(req: Request): string | null {
  const authorization = req.headers.authorization;
  if (!authorization) {
    return null;
  }

  const [scheme, token] = authorization.split(" ");
  if (scheme?.toLowerCase() !== "bearer" || !token) {
    return null;
  }

  return token;
}

async function resolveAuthenticatedUser(req: Request): Promise<{ id: string; username: string } | null> {
  const token = extractBearerToken(req);
  if (!token) {
    return null;
  }

  const user = await storage.getUserByAuthToken(token);
  if (!user) {
    return null;
  }

  return {
    id: user.id,
    username: user.username,
  };
}

async function requireAuth(req: Request, res: Response): Promise<{ id: string; username: string } | null> {
  const user = await resolveAuthenticatedUser(req);
  if (!user) {
    res.status(401).json({ message: "Unauthorized" });
    return null;
  }

  return user;
}

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
    function parseSuggestions(text: string): string[] {
      try {
        const parsed = JSON.parse(text) as unknown;
        if (!Array.isArray(parsed)) {
          return [];
        }

        return parsed
          .map((item) => (typeof item === "string" ? item.trim() : ""))
          .filter(Boolean)
          .slice(0, 3);
      } catch {
        // Best-effort extraction if provider wraps with prose.
        const jsonArrayMatch = text.match(/\[[\s\S]*\]/);
        if (!jsonArrayMatch) {
          return [];
        }

        try {
          const parsed = JSON.parse(jsonArrayMatch[0]) as unknown;
          if (!Array.isArray(parsed)) {
            return [];
          }
          return parsed
            .map((item) => (typeof item === "string" ? item.trim() : ""))
            .filter(Boolean)
            .slice(0, 3);
        } catch {
          return [];
        }
      }
    }

    function buildSuggestCacheKey(token: string | null, filePath: string, history: Array<{ role: string; content: string }>): string {
      const normalizedHistory = history
        .map((entry) => `${entry.role}:${entry.content.trim().slice(0, 200)}`)
        .join("|");
      return `${token || "no-token"}::${filePath}::${normalizedHistory}`;
    }

    function parseProjectPatternSummary(text: string): ProjectPatternSummary | null {
      const fallback: ProjectPatternSummary = {
        stack: "",
        conventions: "",
        structure: "",
        utilities: "",
      };

      const tryParse = (raw: string): ProjectPatternSummary | null => {
        try {
          const parsed = JSON.parse(raw) as Partial<ProjectPatternSummary>;
          if (!parsed || typeof parsed !== "object") {
            return null;
          }

          const summary: ProjectPatternSummary = {
            stack: typeof parsed.stack === "string" ? parsed.stack.trim() : "",
            conventions: typeof parsed.conventions === "string" ? parsed.conventions.trim() : "",
            structure: typeof parsed.structure === "string" ? parsed.structure.trim() : "",
            utilities: typeof parsed.utilities === "string" ? parsed.utilities.trim() : "",
          };

          if (!summary.stack && !summary.conventions && !summary.structure && !summary.utilities) {
            return null;
          }

          return summary;
        } catch {
          return null;
        }
      };

      const direct = tryParse(text);
      if (direct) {
        return direct;
      }

      const jsonObjectMatch = text.match(/\{[\s\S]*\}/);
      if (!jsonObjectMatch) {
        return null;
      }

      return tryParse(jsonObjectMatch[0]) || fallback;
    }

    function summarizeProjectFilesForPrompt(files: Record<string, { content: string; language: string }>): string {
      return Object.entries(files)
        .map(([filePath, file]) => {
          const content = file.content || "";
          const truncated = content.length > 5000 ? `${content.slice(0, 5000)}\n/* truncated */` : content;
          return `FILE: ${filePath}\nLANG: ${file.language}\n${truncated}`;
        })
        .join("\n\n");
    }

    function stripHtmlToText(html: string): string {
      return html
        .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, " ")
        .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, " ")
        .replace(/<[^>]+>/g, " ")
        .replace(/&nbsp;/gi, " ")
        .replace(/&amp;/gi, "&")
        .replace(/&lt;/gi, "<")
        .replace(/&gt;/gi, ">")
        .replace(/\s+/g, " ")
        .trim();
    }

    function extractMetaTags(html: string): { title: string; description: string; og: string[] } {
      const titleMatch = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
      const descriptionMatch = html.match(/<meta[^>]+name=["']description["'][^>]+content=["']([\s\S]*?)["'][^>]*>/i)
        || html.match(/<meta[^>]+content=["']([\s\S]*?)["'][^>]+name=["']description["'][^>]*>/i);

      const ogMatches = Array.from(html.matchAll(/<meta[^>]+property=["']og:([^"']+)["'][^>]+content=["']([\s\S]*?)["'][^>]*>/gi));
      const og = ogMatches
        .map((entry) => `${entry[1]}: ${entry[2]}`.trim())
        .slice(0, 12);

      return {
        title: (titleMatch?.[1] || "").trim(),
        description: (descriptionMatch?.[1] || "").trim(),
        og,
      };
    }

    function extractPageSections(html: string): string[] {
      const lower = html.toLowerCase();
      const results: string[] = [];

      const checks: Array<{ key: string; patterns: RegExp[] }> = [
        { key: "nav", patterns: [/<nav\b/i, /class=["'][^"']*\b(nav|navbar|navigation)\b/i] },
        { key: "hero", patterns: [/<header\b/i, /class=["'][^"']*\b(hero|masthead|banner)\b/i] },
        { key: "features", patterns: [/class=["'][^"']*\b(feature|benefit|capability)\b/i, /id=["'][^"']*feature/i] },
        { key: "pricing", patterns: [/class=["'][^"']*\b(pricing|plan|plans|price)\b/i, /id=["'][^"']*pricing/i] },
        { key: "footer", patterns: [/<footer\b/i, /class=["'][^"']*\bfooter\b/i] },
      ];

      for (const check of checks) {
        if (check.patterns.some((pattern) => pattern.test(lower))) {
          results.push(check.key);
        }
      }

      return results;
    }

    function extractVisibleTextSignals(html: string): { headings: string[]; ctas: string[]; valueProps: string[] } {
      const headingMatches = Array.from(html.matchAll(/<(h1|h2|h3)[^>]*>([\s\S]*?)<\/\1>/gi));
      const headings = headingMatches
        .map((entry) => stripHtmlToText(entry[2]))
        .filter(Boolean)
        .slice(0, 16);

      const ctaMatches = Array.from(html.matchAll(/<(a|button)[^>]*>([\s\S]*?)<\/\1>/gi));
      const ctas = ctaMatches
        .map((entry) => stripHtmlToText(entry[2]))
        .filter((text) => text.length > 0 && text.length <= 60)
        .slice(0, 20);

      const bodyText = stripHtmlToText(html);
      const sentences = bodyText.split(/(?<=[.!?])\s+/).filter((segment) => segment.length > 20);
      const valueProps = sentences
        .filter((segment) => /build|faster|better|platform|solution|help|modern|ai|product|workflow|improve|ship|save/i.test(segment))
        .slice(0, 10);

      return { headings, ctas, valueProps };
    }

    function extractPerformanceHints(html: string): {
      imageCount: number;
      largeImageHints: string[];
      scriptCount: number;
      blockingScripts: number;
      renderBlockingResources: string[];
    } {
      const imageTags = Array.from(html.matchAll(/<img\b[^>]*>/gi)).map((entry) => entry[0]);
      const scriptTags = Array.from(html.matchAll(/<script\b[^>]*>/gi)).map((entry) => entry[0]);
      const linkStyles = Array.from(html.matchAll(/<link\b[^>]*rel=["'][^"']*stylesheet[^"']*["'][^>]*>/gi)).map((entry) => entry[0]);

      const largeImageHints: string[] = [];
      for (const tag of imageTags) {
        const width = Number((tag.match(/\bwidth=["']?(\d+)/i) || [])[1] || 0);
        const height = Number((tag.match(/\bheight=["']?(\d+)/i) || [])[1] || 0);
        const src = (tag.match(/\bsrc=["']([^"']+)/i) || [])[1] || "";

        if ((width >= 1800 || height >= 1400) && src) {
          largeImageHints.push(`${src} (${width}x${height})`);
        }
      }

      const blockingScripts = scriptTags.filter((tag) => /<script\b/i.test(tag) && !/\b(defer|async|type=["']module["'])/i.test(tag)).length;
      const renderBlockingResources = [
        ...linkStyles.slice(0, 8).map((tag) => {
          const href = (tag.match(/\bhref=["']([^"']+)/i) || [])[1] || "stylesheet";
          return `stylesheet: ${href}`;
        }),
        ...scriptTags
          .filter((tag) => !/\b(defer|async|type=["']module["'])/i.test(tag))
          .slice(0, 8)
          .map((tag) => {
            const src = (tag.match(/\bsrc=["']([^"']+)/i) || [])[1] || "inline-script";
            return `script: ${src}`;
          }),
      ];

      return {
        imageCount: imageTags.length,
        largeImageHints: largeImageHints.slice(0, 10),
        scriptCount: scriptTags.length,
        blockingScripts,
        renderBlockingResources,
      };
    }

    function parseCompetitiveAnalysis(text: string): CompetitiveAnalysis | null {
      const parseObject = (raw: string): CompetitiveAnalysis | null => {
        try {
          const parsed = JSON.parse(raw) as Partial<CompetitiveAnalysis>;
          if (!parsed || typeof parsed !== "object") {
            return null;
          }

          const toStringArray = (value: unknown) =>
            Array.isArray(value)
              ? value.map((entry) => (typeof entry === "string" ? entry.trim() : "")).filter(Boolean).slice(0, 8)
              : [];

          return {
            proposition: typeof parsed.proposition === "string" ? parsed.proposition.trim() : "",
            strengths: toStringArray(parsed.strengths),
            weaknesses: toStringArray(parsed.weaknesses),
            gaps: toStringArray(parsed.gaps),
            improvements: toStringArray(parsed.improvements),
          };
        } catch {
          return null;
        }
      };

      const direct = parseObject(text);
      if (direct) {
        return direct;
      }

      const objectMatch = text.match(/\{[\s\S]*\}/);
      if (!objectMatch) {
        return null;
      }

      return parseObject(objectMatch[0]);
    }

    async function parseMultipartForm(req: Request, maxBytes = 6 * 1024 * 1024): Promise<ParsedMultipartForm> {
      const contentType = req.headers["content-type"] || "";
      const boundaryMatch = contentType.match(/boundary=([^;]+)/i);
      if (!boundaryMatch) {
        throw new Error("Multipart boundary missing");
      }

      const boundaryToken = boundaryMatch[1].trim().replace(/^"|"$/g, "");
      const boundary = Buffer.from(`--${boundaryToken}`);
      const chunks: Buffer[] = [];
      let total = 0;

      await new Promise<void>((resolve, reject) => {
        req.on("data", (chunk: Buffer) => {
          total += chunk.length;
          if (total > maxBytes) {
            reject(new Error("Payload too large"));
            return;
          }
          chunks.push(chunk);
        });
        req.on("end", () => resolve());
        req.on("error", (error) => reject(error));
      });

      const raw = Buffer.concat(chunks);
      const fields: Record<string, string> = {};
      let file: ParsedMultipartForm["file"];
      let cursor = 0;

      while (cursor < raw.length) {
        const boundaryIndex = raw.indexOf(boundary, cursor);
        if (boundaryIndex === -1) {
          break;
        }

        let partStart = boundaryIndex + boundary.length;
        if (raw[partStart] === 45 && raw[partStart + 1] === 45) {
          break;
        }
        if (raw[partStart] === 13 && raw[partStart + 1] === 10) {
          partStart += 2;
        }

        const nextBoundaryIndex = raw.indexOf(boundary, partStart);
        if (nextBoundaryIndex === -1) {
          break;
        }

        let partEnd = nextBoundaryIndex;
        if (raw[partEnd - 2] === 13 && raw[partEnd - 1] === 10) {
          partEnd -= 2;
        }

        const part = raw.slice(partStart, partEnd);
        const headerEnd = part.indexOf(Buffer.from("\r\n\r\n"));
        if (headerEnd === -1) {
          cursor = nextBoundaryIndex;
          continue;
        }

        const headerText = part.slice(0, headerEnd).toString("utf8");
        const body = part.slice(headerEnd + 4);

        const dispositionMatch = headerText.match(/content-disposition:\s*form-data;\s*name="([^"]+)"(?:;\s*filename="([^"]+)")?/i);
        if (!dispositionMatch) {
          cursor = nextBoundaryIndex;
          continue;
        }

        const fieldName = dispositionMatch[1];
        const filename = dispositionMatch[2];
        const mimeTypeMatch = headerText.match(/content-type:\s*([^\r\n]+)/i);
        const mimeType = (mimeTypeMatch?.[1] || "application/octet-stream").trim();

        if (filename) {
          file = {
            filename,
            mimeType,
            content: body,
          };
        } else {
          fields[fieldName] = body.toString("utf8").trim();
        }

        cursor = nextBoundaryIndex;
      }

      return { fields, file };
    }

    async function* readGeminiSseText(response: globalThis.Response): AsyncGenerator<string, void, void> {
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

        const parts = buffer.split(/\r?\n\r?\n/);
        buffer = parts.pop() || "";

        for (const rawEvent of parts) {
          const dataLines = rawEvent
            .split(/\r?\n/)
            .map((line) => line.trimStart())
            .filter((line) => line.startsWith("data:"))
            .map((line) => line.slice(5).trim())
            .filter((line) => line && line !== "[DONE]");

          for (const dataLine of dataLines) {
            try {
              const payload = JSON.parse(dataLine) as {
                candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
              };
              const text = payload.candidates?.[0]?.content?.parts
                ?.map((part) => part.text || "")
                .join("");

              if (text) {
                yield text;
              }
            } catch {
              // Ignore malformed chunks.
            }
          }
        }
      }

      if (buffer.trim().length > 0) {
        const dataLines = buffer
          .split(/\r?\n/)
          .map((line) => line.trimStart())
          .filter((line) => line.startsWith("data:"))
          .map((line) => line.slice(5).trim())
          .filter((line) => line && line !== "[DONE]");

        for (const dataLine of dataLines) {
          try {
            const payload = JSON.parse(dataLine) as {
              candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
            };
            const text = payload.candidates?.[0]?.content?.parts
              ?.map((part) => part.text || "")
              .join("");

            if (text) {
              yield text;
            }
          } catch {
            // Ignore malformed chunks.
          }
        }
      }
    }

    function queueProjectPatternAnalysis(req: Request, userId: string, projectId: string): void {
      const token = extractBearerToken(req);
      if (!token) {
        return;
      }

      const port = parseInt(process.env.PORT || "5000", 10);
      const analysisUrl = `http://127.0.0.1:${port}/api/projects/${projectId}/analyse-patterns`;

      setTimeout(async () => {
        try {
          await fetchWithTimeout(analysisUrl, 15_000, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
              "x-synapse-analysis-trigger": "save-hook",
            },
            body: JSON.stringify({ userId }),
          });
        } catch {
          // Ignore background analysis failures.
        }
      }, 0);
    }

  async function fetchWithTimeout(url: string, timeoutMs: number, init?: RequestInit): Promise<globalThis.Response> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);

    try {
      return await fetch(url, {
        ...init,
        signal: controller.signal,
      });
    } finally {
      clearTimeout(timeout);
    }
  }

  function normalizeUrl(input: string): URL {
    const trimmed = input.trim();
    if (!trimmed) {
      throw new Error("URL is required");
    }

    const withProtocol = /^https?:\/\//i.test(trimmed)
      ? trimmed
      : `https://${trimmed}`;

    const parsed = new URL(withProtocol);
    if (!parsed.hostname) {
      throw new Error("Invalid URL format");
    }

    if (!["http:", "https:"].includes(parsed.protocol)) {
      throw new Error("Only HTTP/HTTPS URLs are supported");
    }

    return parsed;
  }

  function ensureHtmlDocument(raw: string): string {
    const text = raw.trim();
    if (!text) {
      return "<!doctype html><html><head><meta charset=\"UTF-8\" /></head><body><p>Empty response from source website.</p></body></html>";
    }

    if (/<!doctype html|<html[\s>]/i.test(text)) {
      return text;
    }

    // Some free proxy sources return plain text/markdown. Wrap it for preview/editing.
    const escaped = text
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");

    return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Cloned Content</title>
    <style>
      body { margin: 0; padding: 24px; font-family: system-ui, sans-serif; background: #0b1020; color: #e5e7eb; }
      pre { white-space: pre-wrap; word-break: break-word; line-height: 1.5; }
    </style>
  </head>
  <body>
    <h1>Cloned Text Snapshot</h1>
    <pre>${escaped}</pre>
  </body>
</html>`;
  }

  function sanitizeAndNormalizeHtml(html: string, sourceUrl: URL): string {
    let output = html;

    // Remove script tags for safety.
    output = output.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "<!-- script removed -->");

    // Remove CSP to avoid blocking local rendering.
    output = output.replace(/<meta[^>]+http-equiv=["']Content-Security-Policy["'][^>]*>/gi, "");

    // Inject/replace base tag so relative assets resolve correctly.
    const baseHref = sourceUrl.href;
    if (/<base\b[^>]*>/i.test(output)) {
      output = output.replace(/<base\b[^>]*>/i, `<base href="${baseHref}">`);
    } else if (/<head[^>]*>/i.test(output)) {
      output = output.replace(/<head([^>]*)>/i, `<head$1>\n  <base href="${baseHref}">`);
    } else {
      output = `<!doctype html><html><head><base href="${baseHref}"></head><body>${output}</body></html>`;
    }

    return `<!-- Cloned from: ${sourceUrl.href} by Synapse Builder -->\n${output}`;
  }

  app.get("/api/health", (_req, res) => {
    res.json({ ok: true });
  });

  app.post("/api/auth/signup", async (req, res) => {
    const parsed = authSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ message: "Invalid request payload" });
    }

    const { username, password } = parsed.data;
    const existingUser = await storage.getUserByUsername(username);
    if (existingUser) {
      return res.status(409).json({ message: "Username already exists" });
    }

    const createdUser = await storage.createUser({
      username,
      password: hashPassword(password),
    });

    await ensureSupabaseUserAndDefaultSubscription(createdUser);
    await logSystemUserAction("user_signup", createdUser.id, {
      source: "email_password",
      username: createdUser.username,
    });

    const token = await storage.createAuthToken(createdUser.id);

    return res.status(201).json({
      token,
      user: {
        id: createdUser.id,
        username: createdUser.username,
      },
    });
  });

  app.post("/api/auth/signin", async (req, res) => {
    const parsed = authSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ message: "Invalid username or password" });
    }

    const { username, password } = parsed.data;
    const user = await storage.getUserByUsername(username);
    if (!user || !verifyPassword(password, user.password)) {
      return res.status(401).json({ message: "Invalid username or password" });
    }

    await ensureSupabaseUserAndDefaultSubscription(user);

    const token = await storage.createAuthToken(user.id);

    return res.json({
      token,
      user: {
        id: user.id,
        username: user.username,
      },
    });
  });

  app.post("/api/auth/signout", async (req, res) => {
    const token = extractBearerToken(req);
    if (token) {
      await storage.revokeAuthToken(token);
    }
    return res.status(204).send();
  });

  app.post("/api/auth/forgot-password", async (req, res) => {
    const parsed = forgotPasswordSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ message: "Invalid request payload" });
    }

    const { username, newPassword } = parsed.data;
    const user = await storage.getUserByUsername(username);

    if (user) {
      await storage.updateUserPassword(user.id, hashPassword(newPassword));
    }

    // Return the same response regardless of user existence.
    return res.json({ message: "If the account exists, the password has been reset." });
  });

  app.post("/api/auth/social-signin", async (req, res) => {
    const parsed = socialSigninSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ message: "Invalid request payload" });
    }

    const { provider, deviceId } = parsed.data;
    const normalizedDeviceId = deviceId.replace(/[^a-zA-Z0-9_-]/g, "").toLowerCase().slice(0, 24);
    const username = `${provider}_${normalizedDeviceId}`;

    let user = await storage.getUserByUsername(username);
    if (!user) {
      user = await storage.createUser({
        username,
        password: hashPassword(randomBytes(24).toString("hex")),
      });

      await ensureSupabaseUserAndDefaultSubscription(user);
      await logSystemUserAction("user_signup", user.id, {
        source: `social_${provider}`,
        username: user.username,
      });
    }

    const token = await storage.createAuthToken(user.id);

    return res.json({
      token,
      provider,
      user: {
        id: user.id,
        username: user.username,
      },
    });
  });

  app.get("/api/auth/session", async (req, res) => {
    const user = await requireAuth(req, res);
    if (!user) {
      return;
    }

    return res.json({
      user: {
        id: user.id,
        username: user.username,
      },
    });
  });

  app.get("/api/dashboard", async (req, res) => {
    const user = await requireAuth(req, res);
    if (!user) {
      return;
    }

    const dashboardData = await storage.getDashboardData(user.id, user.username);
    return res.json(dashboardData);
  });

  app.post("/api/chat", async (req, res) => {
    const user = await requireAuth(req, res);
    if (!user) {
      return;
    }

    const parsed = chatSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ message: "Invalid message payload" });
    }

    type SubscriptionUsage = {
      ai_calls_used?: number | null;
      subscription_plans?: { max_ai_calls?: number | null } | null;
    };

    let sub: SubscriptionUsage | null = null;
    let shouldTrackSupabaseUsage = false;

    try {
      assertSupabaseConfigured();
      shouldTrackSupabaseUsage = true;
      const subRes = await supabase
        .from("user_subscriptions")
        .select("ai_calls_used, subscription_plans(max_ai_calls)")
        .eq("user_id", user.id)
        .single();

      if (subRes.error && subRes.error.code !== "PGRST116") {
        if (isMissingSupabaseRelation(subRes.error)) {
          shouldTrackSupabaseUsage = false;
          sub = null;
        } else {
          return res.status(500).json({ error: subRes.error.message });
        }
      }

      if (!subRes.error) {
        sub = (subRes.data as SubscriptionUsage | null) || null;
      }
    } catch {
      // Supabase not configured: allow non-subscription mode operation.
      shouldTrackSupabaseUsage = false;
      sub = null;
    }

    if (sub) {
      const callsUsed = sub.ai_calls_used ?? 0;
      const maxCalls = (sub.subscription_plans as { max_ai_calls?: number } | null)?.max_ai_calls ?? 50;

      if (callsUsed >= maxCalls) {
        return res.status(429).json({
          error: "AI call limit reached for your current plan. Please upgrade to continue.",
        });
      }
    }

    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    res.flushHeaders?.();

    const {
      message,
      model = "gemini-2.5-flash",
      outputLanguage = "en",
      projectId,
      learningMode = false,
    } = parsed.data;
    const userMessage = {
      id: randomBytes(8).toString("hex"),
      role: "user" as const,
      content: message,
      model,
      timestamp: new Date().toLocaleTimeString("en-US", {
        hour: "numeric",
        minute: "2-digit",
      }),
    };

    await storage.appendChatMessage(user.id, userMessage);

    const history = await storage.getChatMessages(user.id);
    let responseText = "";
    let responseModel = model;

    try {
      const streamResult = await generateWithFailoverStream({
        model,
        userId: user.id,
        projectId,
        learningMode,
        username: user.username,
        outputLanguage,
        history: history.map((entry) => ({
          role: entry.role,
          content: entry.content,
        })),
      });

      responseModel = `${streamResult.provider}:${streamResult.model}`;

      for await (const token of streamResult.stream) {
        responseText += token;
        res.write(`data: ${JSON.stringify({ token })}\n\n`);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown AI provider error";
      res.write(`data: ${JSON.stringify({ error: `AI providers failed: ${errorMessage}` })}\n\n`);
      res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
      res.end();
      return;
    }

    const assistantMessage = {
      id: randomBytes(8).toString("hex"),
      role: "assistant" as const,
      content: responseText,
      model: responseModel,
      timestamp: new Date().toLocaleTimeString("en-US", {
        hour: "numeric",
        minute: "2-digit",
      }),
    };

    await storage.appendChatMessage(user.id, assistantMessage);
    await storage.incrementAIGenerationCount(user.id, user.username);

    if (shouldTrackSupabaseUsage && sub) {
      await supabase
        .from("user_subscriptions")
        .update({ ai_calls_used: (sub.ai_calls_used ?? 0) + 1 })
        .eq("user_id", user.id);
    }

    const editorChanges = extractEditorChangesFromJsonBlocks(responseText);
    res.write(`data: ${JSON.stringify({ done: true, message: assistantMessage, editorChanges })}\n\n`);
    res.end();
    return;
  });

  app.post("/api/billing/credits/purchase", async (req, res) => {
    const user = await requireAuth(req, res);
    if (!user) {
      return;
    }

    const parsed = creditPurchaseSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ message: "Invalid purchase payload" });
    }

    try {
      assertSupabaseConfigured();
    } catch {
      return res.status(503).json({
        message: "Billing service is not configured yet",
      });
    }

    const { credits, amountUsd, paymentMethod, paymentRef } = parsed.data;

    const purchaseResult = await supabase.from("credit_purchases").insert({
      user_id: user.id,
      credits,
      amount_usd: amountUsd,
      payment_method: paymentMethod || "manual",
      payment_ref: paymentRef || null,
      status: "completed",
      purchased_at: new Date().toISOString(),
    });

    if (purchaseResult.error) {
      return res.status(500).json({ message: purchaseResult.error.message });
    }

    await logSystemUserAction("credit_purchase", user.id, {
      credits,
      amountUsd,
      paymentMethod: paymentMethod || "manual",
      paymentRef: paymentRef || null,
    });

    return res.json({ success: true });
  });

  app.post("/api/chat/suggest", async (req, res) => {
    const user = await requireAuth(req, res);
    if (!user) {
      return;
    }

    const parsed = chatSuggestSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ message: "Invalid suggest payload" });
    }

    const { history, currentFile, model = "gemini-2.5-flash" } = parsed.data;
    const compactHistory = history.slice(-6);
    const cacheKey = buildSuggestCacheKey(extractBearerToken(req), currentFile || "", compactHistory);
    const now = Date.now();
    const cached = suggestionCache.get(cacheKey);

    if (cached && cached.expiresAt > now) {
      return res.json({ suggestions: cached.suggestions, cached: true });
    }

    const compactPrompt = [
      "Given this conversation, suggest 3 short follow-up questions the user is likely to ask next.",
      "Return as JSON array of strings. Max 8 words each.",
      `Current file: ${currentFile || "(none)"}`,
      "Conversation:",
      ...compactHistory.map((entry) => `${entry.role}: ${entry.content}`),
    ].join("\n");

    try {
      const result = await generateWithFailover({
        model,
        username: user.username,
        outputLanguage: "en",
        maxTokens: 150,
        history: [{ role: "user", content: compactPrompt }],
      });

      const suggestions = parseSuggestions(result.text);
      suggestionCache.set(cacheKey, {
        suggestions,
        expiresAt: now + 30_000,
      });

      return res.json({ suggestions, cached: false });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Suggestion generation failed";
      return res.status(502).json({ message });
    }
  });

  app.get("/api/chat/history", async (req, res) => {
    const user = await requireAuth(req, res);
    if (!user) {
      return;
    }
    const messages = await storage.getChatMessages(user.id);
    return res.json({ messages });
  });

  app.delete("/api/chat/history", async (req, res) => {
    const user = await requireAuth(req, res);
    if (!user) {
      return;
    }
    await storage.clearChatMessages(user.id);
    return res.status(204).send();
  });

  // ─── Project Routes ──────────────────────────────────────────

  const createProjectSchema = z.object({
    name: z.string().trim().min(1).max(200).optional(),
    template: z.enum(["blank", "react"]).optional(),
  });

  const updateFilesSchema = z.object({
    files: z.record(
      z.string(),
      z.object({
        content: z.string(),
        language: z.string(),
      }),
    ),
  });

  const renameProjectSchema = z.object({
    name: z.string().trim().min(1).max(200),
  });

  const REACT_TEMPLATE_FILES: Record<string, { content: string; language: string }> = {
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
    "src/pages/Home.tsx": {
      language: "typescript",
      content: `import Hero from '../components/Hero';

export default function Home() {
  return (
    <main>
      <Hero />
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
`,
    },
  };

  app.post("/api/projects", async (req, res) => {
    const user = await requireAuth(req, res);
    if (!user) {
      return;
    }

    const parsed = createProjectSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ message: "Invalid request payload" });
    }

    const { name = "Untitled Project", template = "react" } = parsed.data;
    const files = template === "blank" ? {} : REACT_TEMPLATE_FILES;
    const project = await storage.createProject(user.id, name, files);

    return res.status(201).json(project);
  });

  app.get("/api/projects", async (req, res) => {
    const user = await requireAuth(req, res);
    if (!user) {
      return;
    }

    const projects = await storage.getProjectsByUser(user.id);
    return res.json(projects);
  });

  app.get("/api/projects/:id", async (req, res) => {
    const user = await requireAuth(req, res);
    if (!user) {
      return;
    }

    const project = await storage.getProject(req.params.id);
    if (!project || project.userId !== user.id) {
      return res.status(404).json({ message: "Project not found" });
    }

    const chatwoot = await storage.getProjectChatwootIntegration(user.id, req.params.id);

    return res.json({
      ...project,
      integrations: {
        chatwoot: chatwoot
          ? {
              websiteToken: chatwoot.websiteToken,
              chatwootUrl: chatwoot.chatwootUrl,
              updatedAt: chatwoot.updatedAt,
            }
          : null,
      },
    });
  });

  app.post("/api/integrations/chatwoot/configure", async (req, res) => {
    const user = await requireAuth(req, res);
    if (!user) {
      return;
    }

    const parsed = chatwootConfigureSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ message: "Invalid integration payload" });
    }

    const { projectId, websiteToken } = parsed.data;

    const project = await storage.getProject(projectId);
    if (!project || project.userId !== user.id) {
      return res.status(404).json({ message: "Project not found" });
    }

    let chatwootUrl: string;
    try {
      chatwootUrl = normalizeChatwootBaseUrl(parsed.data.chatwootUrl);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Invalid Chatwoot URL";
      return res.status(400).json({ message });
    }

    const saved = await storage.upsertProjectChatwootIntegration(
      user.id,
      projectId,
      websiteToken,
      chatwootUrl,
    );

    return res.json({
      projectId: saved.projectId,
      websiteToken: saved.websiteToken,
      chatwootUrl: saved.chatwootUrl,
      updatedAt: saved.updatedAt,
    });
  });

  app.post("/api/projects/:id/analyse-patterns", async (req, res) => {
    const user = await requireAuth(req, res);
    if (!user) {
      return;
    }

    const project = await storage.getProject(req.params.id);
    if (!project || project.userId !== user.id) {
      return res.status(404).json({ message: "Project not found" });
    }

    const prompt = [
      "Analyse this codebase. Extract: 1) preferred framework/stack 2) naming conventions 3) folder structure pattern 4) any repeated custom utilities.",
      "Return as JSON with keys: stack, conventions, structure, utilities. Max 40 words per field.",
      summarizeProjectFilesForPrompt(project.files),
    ].join("\n\n");

    try {
      const ai = await generateWithFailover({
        model: "gemini-2.5-flash",
        username: user.username,
        outputLanguage: "en",
        maxTokens: 150,
        history: [{ role: "user", content: prompt }],
      });

      const parsedSummary = parseProjectPatternSummary(ai.text);
      if (!parsedSummary) {
        return res.status(502).json({ message: "Could not parse project analysis response" });
      }

      const insights = [
        `stack: ${parsedSummary.stack}`,
        `conventions: ${parsedSummary.conventions}`,
        `structure: ${parsedSummary.structure}`,
        `utilities: ${parsedSummary.utilities}`,
      ].filter((entry) => !entry.endsWith(": "));

      const stored = await storage.upsertProjectInsights(user.id, project.id, insights);
      return res.json({ summary: parsedSummary, insights: stored.insights, createdAt: stored.createdAt });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to analyse project patterns";
      return res.status(502).json({ message });
    }
  });

  app.put("/api/projects/:id/files", async (req, res) => {
    const user = await requireAuth(req, res);
    if (!user) {
      return;
    }

    const parsed = updateFilesSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ message: "Invalid request payload" });
    }

    const project = await storage.getProject(req.params.id);
    if (!project || project.userId !== user.id) {
      return res.status(404).json({ message: "Project not found" });
    }

    const updated = await storage.updateProjectFiles(req.params.id, parsed.data.files);

    const fileCount = Object.keys(parsed.data.files).length;
    if (updated && fileCount > 5) {
      const shouldRefresh = await storage.shouldRefreshProjectInsights(user.id, req.params.id, 24);
      if (shouldRefresh) {
        queueProjectPatternAnalysis(req, user.id, req.params.id);
      }
    }

    return res.json(updated);
  });

  app.patch("/api/projects/:id", async (req, res) => {
    const user = await requireAuth(req, res);
    if (!user) {
      return;
    }

    const parsed = renameProjectSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ message: "Invalid request payload" });
    }

    const project = await storage.getProject(req.params.id);
    if (!project || project.userId !== user.id) {
      return res.status(404).json({ message: "Project not found" });
    }

    const updated = await storage.renameProject(req.params.id, parsed.data.name);
    return res.json(updated);
  });

  app.delete("/api/projects/:id", async (req, res) => {
    const user = await requireAuth(req, res);
    if (!user) {
      return;
    }

    const project = await storage.getProject(req.params.id);
    if (!project || project.userId !== user.id) {
      return res.status(404).json({ message: "Project not found" });
    }

    await storage.deleteProject(req.params.id);
    return res.status(204).send();
  });

  // Clone website - fetch HTML from URL
  app.post("/api/clone-website", async (req: Request, res: Response) => {
    const user = await requireAuth(req, res);
    if (!user) {
      return;
    }

    try {
      const { url } = req.body;
      if (!url || typeof url !== "string") {
        return res.status(400).json({ message: "URL is required" });
      }

      let parsedUrl: URL;
      try {
        parsedUrl = normalizeUrl(url);
      } catch {
        return res.status(400).json({ message: "Invalid URL format" });
      }

      const directHeaders = {
        "User-Agent": "Mozilla/5.0 (compatible; SynapseBuilder/1.0)",
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9",
        "Cache-Control": "no-cache",
      };

      const candidates: Array<() => Promise<{ html: string; source: string }>> = [
        async () => {
          const response = await fetchWithTimeout(parsedUrl.href, 12000, { headers: directHeaders, redirect: "follow" });
          if (!response.ok) {
            throw new Error(`Direct fetch failed: ${response.status} ${response.statusText}`);
          }

          return {
            html: await response.text(),
            source: "direct",
          };
        },
        async () => {
          // Free proxy fallback for websites that block common bot/user-agent fetches.
          const proxyUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(parsedUrl.href)}`;
          const response = await fetchWithTimeout(proxyUrl, 15000);
          if (!response.ok) {
            throw new Error(`AllOrigins failed: ${response.status} ${response.statusText}`);
          }

          return {
            html: await response.text(),
            source: "allorigins",
          };
        },
        async () => {
          // Free text snapshot fallback when normal HTML fetching is blocked.
          const snapshotUrl = `https://r.jina.ai/http://${parsedUrl.host}${parsedUrl.pathname}${parsedUrl.search}`;
          const response = await fetchWithTimeout(snapshotUrl, 15000);
          if (!response.ok) {
            throw new Error(`Jina fallback failed: ${response.status} ${response.statusText}`);
          }

          return {
            html: await response.text(),
            source: "jina",
          };
        },
      ];

      let rawHtml = "";
      let usedSource = "";
      let lastError = "Unknown clone error";

      for (const candidate of candidates) {
        try {
          const result = await candidate();
          rawHtml = result.html;
          usedSource = result.source;
          if (rawHtml.trim().length > 0) {
            break;
          }
        } catch (error) {
          lastError = error instanceof Error ? error.message : "Unknown clone error";
        }
      }

      if (!rawHtml.trim()) {
        return res.status(502).json({ message: `Failed to clone website: ${lastError}` });
      }

      const htmlDocument = ensureHtmlDocument(rawHtml);
      const normalizedHtml = sanitizeAndNormalizeHtml(htmlDocument, parsedUrl);

      const textSignals = extractVisibleTextSignals(normalizedHtml);
      const meta = extractMetaTags(normalizedHtml);
      const structure = extractPageSections(normalizedHtml);
      const performance = extractPerformanceHints(normalizedHtml);

      const analysisPrompt = [
        "You are a product strategist. Analyse this website's content and structure.",
        "Identify: 1) their core value proposition 2) UX strengths 3) UX weaknesses 4) missing features a competitor could exploit 5) 3 specific improvements to outperform them.",
        "Be direct and tactical.",
        "Return as JSON: { proposition, strengths[], weaknesses[], gaps[], improvements[] }",
        "",
        `URL: ${parsedUrl.href}`,
        `Title: ${meta.title}`,
        `Description: ${meta.description}`,
        `OpenGraph: ${meta.og.join(" | ")}`,
        `Detected sections: ${structure.join(", ")}`,
        `Headings: ${textSignals.headings.join(" | ")}`,
        `CTAs: ${textSignals.ctas.join(" | ")}`,
        `Value props: ${textSignals.valueProps.join(" | ")}`,
        `Performance hints: imageCount=${performance.imageCount}, scriptCount=${performance.scriptCount}, blockingScripts=${performance.blockingScripts}`,
        `Large image hints: ${performance.largeImageHints.join(" | ")}`,
        `Render-blocking resources: ${performance.renderBlockingResources.join(" | ")}`,
      ].join("\n");

      let analysis: CompetitiveAnalysis = {
        proposition: "",
        strengths: [],
        weaknesses: [],
        gaps: [],
        improvements: [],
      };

      try {
        const aiResult = await generateWithFailover({
          model: "gemini-2.5-flash",
          username: user.username,
          outputLanguage: "en",
          maxTokens: 300,
          history: [{ role: "user", content: analysisPrompt }],
        });
        const parsedAnalysis = parseCompetitiveAnalysis(aiResult.text);
        if (parsedAnalysis) {
          analysis = parsedAnalysis;
        }
      } catch {
        // If analysis fails, still return cloned output.
      }

      return res.json({
        html: normalizedHtml,
        url: parsedUrl.href,
        title: parsedUrl.hostname,
        source: usedSource,
        analysis,
      });

    } catch (error: any) {
      return res.status(500).json({ message: error.message || "Internal server error" });
    }
  });

  app.post("/api/clone-screenshot", async (req: Request, res: Response) => {
    const user = await requireAuth(req, res);
    if (!user) {
      return;
    }

    let parsedForm: ParsedMultipartForm;
    try {
      parsedForm = await parseMultipartForm(req, 6 * 1024 * 1024);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Invalid multipart payload";
      return res.status(400).json({ message });
    }

    if (!parsedForm.file) {
      return res.status(400).json({ message: "Image file is required" });
    }

    const { file, fields } = parsedForm;
    if (file.content.length > 5 * 1024 * 1024) {
      return res.status(400).json({ message: "Image exceeds 5MB limit" });
    }

    const allowedTypes = new Set(["image/png", "image/jpeg", "image/jpg"]);
    if (!allowedTypes.has(file.mimeType.toLowerCase())) {
      return res.status(400).json({ message: "Only PNG/JPG images are supported" });
    }

    const mode = fields.mode === "iterate" ? "iterate" : "initial";
    const instruction = (fields.instruction || "").trim();
    const currentHtml = fields.currentHtml || "";
    const imageBase64 = file.content.toString("base64");

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ message: "GEMINI_API_KEY is not configured" });
    }

    const prompt = mode === "iterate"
      ? [
          "You are a frontend developer.",
          "Given the screenshot and current HTML implementation, apply the requested UI changes.",
          "Return only a unified diff in ```diff format for file screenshot-clone.html.",
          "Do not return full file.",
          `Instruction: ${instruction || "Improve visual fidelity to the screenshot."}`,
          "Current HTML:",
          currentHtml,
        ].join("\n\n")
      : [
          "You are a frontend developer. Analyse this UI screenshot. Generate a complete, faithful HTML + Tailwind CSS implementation that replicates the layout, typography hierarchy, spacing, and color scheme.",
          "Use semantic HTML.",
          "Do not use placeholder text — infer actual content from the screenshot.",
          "Output only the complete HTML file, no explanation.",
        ].join("\n");

    const geminiResponse = await fetch("https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:streamGenerateContent?alt=sse", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-goog-api-key": apiKey,
      },
      body: JSON.stringify({
        contents: [
          {
            role: "user",
            parts: [
              { text: prompt },
              {
                inlineData: {
                  mimeType: file.mimeType,
                  data: imageBase64,
                },
              },
            ],
          },
        ],
      }),
    });

    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    res.flushHeaders?.();

    if (!geminiResponse.ok) {
      const errorText = await geminiResponse.text();
      res.write(`data: ${JSON.stringify({ error: errorText || "Vision generation failed", done: true })}\n\n`);
      res.end();
      return;
    }

    for await (const token of readGeminiSseText(geminiResponse)) {
      res.write(`data: ${JSON.stringify({ token })}\n\n`);
    }

    res.write(`data: ${JSON.stringify({ done: true, mode })}\n\n`);
    res.end();
    return;
  });

  return httpServer;
}
