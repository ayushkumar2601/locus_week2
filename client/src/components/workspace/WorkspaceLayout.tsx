import { useState, useCallback, useEffect, useRef, useMemo, memo } from "react";
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from "@/components/ui/resizable";
import TopBar from "./TopBar";
import FileExplorer from "./FileExplorer";
import EditorPanel, { type EditorTab, DEFAULT_FILE_CONTENTS } from "./EditorPanel";
import TerminalPanel, { type TerminalPanelHandle } from "./TerminalPanel";
import AIChatPanel, { type EditorChange } from "./AIChatPanel";
import PanelErrorBoundary from "./PanelErrorBoundary";
import {
    GitBranch,
    AlertCircle,
    CheckCircle2,
    Wifi,
    Loader2,
    MonitorPlay,
    X,
    ExternalLink,
    Copy,
    Download,
    Monitor,
    Tablet,
    Smartphone,
    Brain,
    ChevronDown,
    ChevronRight,
} from "lucide-react";
import { apiRequest, getAuthToken } from "@/lib/queryClient";

interface WorkspaceLayoutProps {
    projectId: string;
    initialVoiceMode?: boolean;
}

const MemoFileExplorer = memo(FileExplorer);
const MemoEditorPanel = memo(EditorPanel);
const MemoAIChatPanel = memo(AIChatPanel);
const MemoTerminalPanel = memo(TerminalPanel);

const LEARNING_MODE_KEY = "synapse.learning.mode";

type CompetitorAnalysis = {
    proposition?: string;
    strengths?: string[];
    weaknesses?: string[];
    gaps?: string[];
    improvements?: string[];
};

type ScreenshotCloneMode = "initial" | "iterate";

type ChatwootConfig = {
    chatwootUrl: string;
    websiteToken: string;
};

function applyUnifiedDiffToContent(original: string, patch: string): string | null {
    const normalizedPatch = patch.replace(/\r\n/g, "\n");
    const hunkRegex = /@@ -\d+(?:,\d+)? \+(\d+)(?:,(\d+))? @@/g;
    const hunks: Array<{ newStart: number; lines: string[] }> = [];
    let match: RegExpExecArray | null;

    while ((match = hunkRegex.exec(normalizedPatch)) !== null) {
        const hunkStartIndex = match.index;
        const nextMatch = hunkRegex.exec(normalizedPatch);
        const hunkBody = normalizedPatch
            .slice(hunkStartIndex + match[0].length, nextMatch ? nextMatch.index : normalizedPatch.length)
            .trimStart();

        hunks.push({
            newStart: Number(match[1]),
            lines: hunkBody.split("\n").filter((line) => line.length > 0),
        });

        if (nextMatch) {
            hunkRegex.lastIndex = nextMatch.index;
        }
    }

    if (hunks.length === 0) {
        return null;
    }

    const originalLines = original.replace(/\r\n/g, "\n").split("\n");
    const resultLines: string[] = [];
    let originalIndex = 0;

    for (const hunk of hunks) {
        const targetIndex = Math.max(0, hunk.newStart - 1);
        while (originalIndex < targetIndex && originalIndex < originalLines.length) {
            resultLines.push(originalLines[originalIndex]);
            originalIndex += 1;
        }

        for (const line of hunk.lines) {
            if (line.startsWith(" ")) {
                const expected = line.slice(1);
                if (originalLines[originalIndex] !== expected) {
                    return null;
                }
                resultLines.push(expected);
                originalIndex += 1;
            } else if (line.startsWith("-")) {
                const expected = line.slice(1);
                if (originalLines[originalIndex] !== expected) {
                    return null;
                }
                originalIndex += 1;
            } else if (line.startsWith("+")) {
                resultLines.push(line.slice(1));
            }
        }
    }

    while (originalIndex < originalLines.length) {
        resultLines.push(originalLines[originalIndex]);
        originalIndex += 1;
    }

    return resultLines.join("\n");
}

function extractFirstDiffBlock(content: string): string | null {
    const match = content.match(/```diff\s*([\s\S]*?)```/i);
    if (!match) {
        return null;
    }
    return match[1].trim();
}

function escapeJsString(input: string): string {
    return input.replace(/\\/g, "\\\\").replace(/'/g, "\\'");
}

function buildChatwootSnippet(config: ChatwootConfig): string {
    const url = escapeJsString(config.chatwootUrl.trim().replace(/\/+$/, ""));
    const token = escapeJsString(config.websiteToken.trim());
    return `<script>\n(function(d,t) {\n  var BASE_URL='${url}';\n  var g=d.createElement(t),s=d.getElementsByTagName(t)[0];\n  g.src=BASE_URL+'/packs/js/sdk.js';\n  g.defer=true; g.async=true;\n  s.parentNode.insertBefore(g,s);\n  g.onload=function(){\n    window.chatwootSDK.run({websiteToken:'${token}',baseUrl:BASE_URL})\n  }\n})(document,'script');\n</script>`;
}

function injectChatwootSnippet(html: string, config: ChatwootConfig | null): string {
    if (!config || !config.chatwootUrl.trim() || !config.websiteToken.trim()) {
        return html;
    }

    if (/chatwootsdk\.run|\/packs\/js\/sdk\.js/i.test(html)) {
        return html;
    }

    const snippet = buildChatwootSnippet(config);
    if (/<\/body>/i.test(html)) {
        return html.replace(/<\/body>/i, `${snippet}\n</body>`);
    }
    return `${html}\n${snippet}`;
}

function normalizeVirtualPath(path: string): string {
    const normalized = path.replace(/\\/g, "/").replace(/^\.\//, "");
    return normalized.startsWith("/") ? normalized.slice(1) : normalized;
}

function dirnameVirtualPath(path: string): string {
    const normalized = normalizeVirtualPath(path);
    const lastSlash = normalized.lastIndexOf("/");
    return lastSlash === -1 ? "" : normalized.slice(0, lastSlash);
}

function resolveVirtualPath(fromPath: string, targetPath: string): string | null {
    const trimmed = targetPath.trim();
    if (!trimmed || trimmed.startsWith("#")) {
        return null;
    }

    const lower = trimmed.toLowerCase();
    if (
        lower.startsWith("http://") ||
        lower.startsWith("https://") ||
        lower.startsWith("data:") ||
        lower.startsWith("blob:") ||
        lower.startsWith("mailto:") ||
        lower.startsWith("tel:")
    ) {
        return null;
    }

    const baseDir = dirnameVirtualPath(fromPath);
    const combined = trimmed.startsWith("/")
        ? trimmed
        : (baseDir ? `${baseDir}/${trimmed}` : trimmed);

    const parts = combined.split("/");
    const stack: string[] = [];

    for (const part of parts) {
        if (!part || part === ".") {
            continue;
        }
        if (part === "..") {
            stack.pop();
            continue;
        }
        stack.push(part);
    }

    return stack.join("/");
}

function guessMimeType(path: string): string {
    const lower = path.toLowerCase();
    if (lower.endsWith(".svg")) return "image/svg+xml";
    if (lower.endsWith(".css")) return "text/css";
    if (lower.endsWith(".js") || lower.endsWith(".mjs")) return "text/javascript";
    if (lower.endsWith(".json")) return "application/json";
    if (lower.endsWith(".html") || lower.endsWith(".htm")) return "text/html";
    return "text/plain";
}

function toDataUri(path: string, content: string): string {
    const mime = guessMimeType(path);
    return `data:${mime};charset=utf-8,${encodeURIComponent(content)}`;
}

function escapeHtml(value: string): string {
        return value
                .replace(/&/g, "&amp;")
                .replace(/</g, "&lt;")
                .replace(/>/g, "&gt;")
                .replace(/\"/g, "&quot;")
                .replace(/'/g, "&#39;");
}

function decodeHtmlEntities(value: string): string {
        const textArea = document.createElement("textarea");
        textArea.innerHTML = value;
        return textArea.value;
}

function normalizeEntryHtmlSource(content: string): string {
        const trimmed = content.trim();
        if (!trimmed) {
                return trimmed;
        }

        const hasRealTags = /<\s*(html|head|body|div|main|section|script|style|meta|link)\b/i.test(trimmed);
        const hasEscapedTags = /&lt;\s*(html|head|body|div|main|section|script|style|meta|link)\b/i.test(trimmed);

        if (!hasRealTags && hasEscapedTags) {
                return decodeHtmlEntities(trimmed);
        }

        return trimmed;
}

function hasMeaningfulBody(doc: Document): boolean {
        const body = doc.body;
        if (!body) {
                return false;
        }

        const text = body.textContent?.replace(/\s+/g, " ").trim() || "";
        if (text.length > 60) {
                return true;
        }

        const meaningful = body.querySelectorAll("img, svg, video, canvas, iframe, main, section, article, header, footer, nav").length;
        if (meaningful > 0) {
                return true;
        }

        return body.children.length > 2;
}

function createSourceFallbackHtml(entryPath: string, source: string, reason: string): string {
        return `<!doctype html>
<html lang="en">
<head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width,initial-scale=1" />
    <title>Preview Fallback</title>
    <style>
        :root { color-scheme: dark; }
        body {
            margin: 0;
            font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace;
            background: #0b0b10;
            color: #e5e7eb;
        }
        .wrap { padding: 14px; }
        .note {
            margin-bottom: 12px;
            padding: 10px 12px;
            border: 1px solid #2c3242;
            border-radius: 8px;
            background: #131a2a;
            font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, sans-serif;
            font-size: 12px;
            line-height: 1.5;
        }
        pre {
            margin: 0;
            white-space: pre-wrap;
            word-break: break-word;
            line-height: 1.45;
            font-size: 12px;
            background: #090c16;
            border: 1px solid #1f2433;
            border-radius: 8px;
            padding: 12px;
            max-height: calc(100vh - 110px);
            overflow: auto;
        }
    </style>
</head>
<body>
    <div class="wrap">
        <div class="note">
            <strong>Static preview fallback</strong><br />
            File: ${escapeHtml(entryPath)}<br />
            Reason: ${escapeHtml(reason)}
        </div>
        <pre>${escapeHtml(source)}</pre>
    </div>
</body>
</html>`;
}

function pickPreviewEntry(
    files: Record<string, { content: string; language: string }>,
    preferredPath: string | null,
): string | null {
    const keys = Object.keys(files);
    const htmlPaths = keys.filter((path) => path.toLowerCase().endsWith(".html"));
    if (htmlPaths.length === 0) {
        return null;
    }

    if (preferredPath && files[preferredPath] && preferredPath.toLowerCase().endsWith(".html")) {
        return preferredPath;
    }

    const normalizedToActual = new Map<string, string>();
    for (const path of htmlPaths) {
        normalizedToActual.set(normalizeVirtualPath(path), path);
    }

    const preferredNames = ["index.html", "src/index.html", "public/index.html", "cloned-site/index.html"];
    for (const preferred of preferredNames) {
        const found = normalizedToActual.get(preferred);
        if (found) {
            return found;
        }
    }

    const nestedIndex = htmlPaths
        .filter((path) => normalizeVirtualPath(path).endsWith("/index.html"))
        .sort((a, b) => a.length - b.length)[0];

    return nestedIndex || htmlPaths.sort((a, b) => a.length - b.length)[0];
}

function buildPreviewDocument(
    files: Record<string, { content: string; language: string }>,
    preferredPath: string | null,
    chatwootConfig: ChatwootConfig | null,
): { html: string | null; entryPath: string | null; message?: string } {
    const entryPath = pickPreviewEntry(files, preferredPath);
    if (!entryPath) {
        return {
            html: null,
            entryPath: null,
            message: "No HTML entry file found. Create or open an HTML file to preview.",
        };
    }

    const entry = files[entryPath];
    if (!entry || !entry.content.trim()) {
        return {
            html: null,
            entryPath,
            message: `The preview entry file ${entryPath} is empty.`,
        };
    }

    try {
        const normalizedSource = normalizeEntryHtmlSource(entry.content);
        const isClonedSite = normalizeVirtualPath(entryPath).startsWith("cloned-site/");
        const unsupportedModules: string[] = [];

        const parser = new DOMParser();
        const doc = parser.parseFromString(normalizedSource, "text/html");

        if (!doc.head) {
            const head = doc.createElement("head");
            doc.documentElement.insertBefore(head, doc.body || null);
        }

        // Remove restrictive CSP/X-Frame metadata that can blank out srcDoc previews.
        doc.querySelectorAll("meta[http-equiv]").forEach((meta) => {
            const httpEquiv = (meta.getAttribute("http-equiv") || "").toLowerCase();
            if (httpEquiv === "content-security-policy" || httpEquiv === "x-frame-options") {
                meta.remove();
            }
        });

        const baseHref = `https://preview.local/${dirnameVirtualPath(entryPath) ? `${dirnameVirtualPath(entryPath)}/` : ""}`;
        const existingBase = doc.querySelector("base");
        if (!existingBase) {
            const base = doc.createElement("base");
            base.setAttribute("href", baseHref);
            doc.head.prepend(base);
        }

        const stylesheetLinks = Array.from(doc.querySelectorAll("link[rel~='stylesheet'][href]"));
        for (const link of stylesheetLinks) {
            const href = link.getAttribute("href");
            if (!href) {
                continue;
            }

            const resolved = resolveVirtualPath(entryPath, href);
            if (!resolved) {
                continue;
            }

            const matchedPath = Object.keys(files).find((path) => normalizeVirtualPath(path) === resolved);
            if (!matchedPath) {
                continue;
            }

            const styleTag = doc.createElement("style");
            styleTag.textContent = files[matchedPath].content;
            link.replaceWith(styleTag);
        }

        const scripts = Array.from(doc.querySelectorAll("script[src]"));
        for (const script of scripts) {
            const src = script.getAttribute("src");
            if (!src) {
                continue;
            }

            const resolved = resolveVirtualPath(entryPath, src);
            if (!resolved) {
                if (isClonedSite) {
                    // Keep cloned preview deterministic by preventing external script bootstraps.
                    script.remove();
                }
                continue;
            }

            const matchedPath = Object.keys(files).find((path) => normalizeVirtualPath(path) === resolved);
            if (!matchedPath) {
                const normalizedSrc = src.trim().toLowerCase();
                // Prevent iframe preview from trying to attach to Vite HMR websockets.
                if (
                    normalizedSrc.startsWith("/@vite") ||
                    normalizedSrc.includes("vite/client") ||
                    normalizedSrc.includes("@react-refresh") ||
                    normalizedSrc.includes("localhost:5173")
                ) {
                    script.remove();
                }
                continue;
            }

            const lower = matchedPath.toLowerCase();
            if (lower.endsWith(".ts") || lower.endsWith(".tsx") || lower.endsWith(".jsx")) {
                unsupportedModules.push(matchedPath);
                script.remove();
                continue;
            }

            const inlineScript = doc.createElement("script");
            const scriptType = script.getAttribute("type");
            if (scriptType) {
                inlineScript.setAttribute("type", scriptType);
            }
            inlineScript.textContent = files[matchedPath].content;
            script.replaceWith(inlineScript);
        }

        const localAssetSelectors = ["img[src]", "source[src]", "video[src]", "audio[src]"];
        for (const selector of localAssetSelectors) {
            const elements = Array.from(doc.querySelectorAll(selector));
            for (const element of elements) {
                const src = element.getAttribute("src");
                if (!src) {
                    continue;
                }

                const resolved = resolveVirtualPath(entryPath, src);
                if (!resolved) {
                    continue;
                }

                const matchedPath = Object.keys(files).find((path) => normalizeVirtualPath(path) === resolved);
                if (!matchedPath) {
                    continue;
                }

                const lower = matchedPath.toLowerCase();
                if (lower.endsWith(".svg") || lower.endsWith(".css") || lower.endsWith(".js") || lower.endsWith(".json") || lower.endsWith(".html") || lower.endsWith(".htm")) {
                    element.setAttribute("src", toDataUri(matchedPath, files[matchedPath].content));
                }
            }
        }

        if (!hasMeaningfulBody(doc)) {
            return {
                html: createSourceFallbackHtml(entryPath, normalizedSource, "Rendered output was empty in sandbox preview"),
                entryPath,
                message: "Rendered output was empty; showing static source fallback.",
            };
        }

        if (unsupportedModules.length > 0) {
            const warning = doc.createElement("div");
            warning.setAttribute(
                "style",
                "position:fixed;top:8px;right:8px;z-index:2147483647;padding:8px 10px;border-radius:8px;background:#111827;color:#f9fafb;border:1px solid #374151;font:12px/1.4 system-ui,sans-serif;max-width:320px;",
            );
            warning.textContent = "Preview note: local TS/TSX scripts were skipped in iframe mode.";
            doc.body?.prepend(warning);
        }

        return {
            html: injectChatwootSnippet(`<!doctype html>\n${doc.documentElement.outerHTML}`, chatwootConfig),
            entryPath,
        };
    } catch (error) {
        const message = error instanceof Error ? error.message : "Failed to render preview.";
        return {
            html: null,
            entryPath,
            message,
        };
    }
}

export default function WorkspaceLayout({ projectId, initialVoiceMode = false }: WorkspaceLayoutProps) {
    const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
    const [sidePanelTab, setSidePanelTab] = useState<"explorer" | "integrations">("explorer");
    const [tabs, setTabs] = useState<EditorTab[]>([]);
    const [activeTab, setActiveTab] = useState<string | null>(null);
    const [files, setFiles] = useState<Record<string, { content: string; language: string }>>(
        DEFAULT_FILE_CONTENTS
    );
    const [projectName, setProjectName] = useState("Untitled Project");
    const [isLoading, setIsLoading] = useState(true);
    const [saveStatus, setSaveStatus] = useState<"saved" | "saving" | "unsaved">("saved");
    const [username, setUsername] = useState("User");
    const [isPreviewOpen, setIsPreviewOpen] = useState(false);
    const [previewRefreshKey, setPreviewRefreshKey] = useState(0);
    const [previewViewport, setPreviewViewport] = useState<"responsive" | "desktop" | "tablet" | "mobile">("responsive");
    const [isPreviewAutoRefresh, setIsPreviewAutoRefresh] = useState(true);
    const [previewToast, setPreviewToast] = useState<string | null>(null);
    const [workspaceToasts, setWorkspaceToasts] = useState<Array<{ id: number; text: string }>>([]);
    const [tokenEstimate, setTokenEstimate] = useState(0);
    const [fileLastModified, setFileLastModified] = useState<Record<string, number>>({});
    const [chatStreamingActive, setChatStreamingActive] = useState(false);
    const [streamTokenSeq, setStreamTokenSeq] = useState(0);
    const [streamToken, setStreamToken] = useState<string | null>(null);
    const [streamCommitSeq, setStreamCommitSeq] = useState(0);
    const [learningMode, setLearningMode] = useState(true);
    const [analysisPanelOpen, setAnalysisPanelOpen] = useState(false);
    const [analysisData, setAnalysisData] = useState<CompetitorAnalysis | null>(null);
    const [analysisSourceTitle, setAnalysisSourceTitle] = useState<string | null>(null);
    const [chatPrefillPrompt, setChatPrefillPrompt] = useState("");
    const [chatPrefillSeq, setChatPrefillSeq] = useState(0);
    const [analysisCollapsed, setAnalysisCollapsed] = useState<Record<string, boolean>>({});
    const [screenshotOverlayOpen, setScreenshotOverlayOpen] = useState(false);
    const [isScreenshotDragActive, setIsScreenshotDragActive] = useState(false);
    const [screenshotPanelOpen, setScreenshotPanelOpen] = useState(false);
    const [screenshotImageDataUrl, setScreenshotImageDataUrl] = useState<string | null>(null);
    const [screenshotFile, setScreenshotFile] = useState<File | null>(null);
    const [screenshotGenerating, setScreenshotGenerating] = useState(false);
    const [screenshotIterating, setScreenshotIterating] = useState(false);
    const [screenshotIterateInstruction, setScreenshotIterateInstruction] = useState("");
    const [screenshotStatus, setScreenshotStatus] = useState<string | null>(null);
    const [screenshotIterateDiff, setScreenshotIterateDiff] = useState("");
    const [chatwootUrl, setChatwootUrl] = useState("");
    const [chatwootWebsiteToken, setChatwootWebsiteToken] = useState("");
    const [chatwootSaving, setChatwootSaving] = useState(false);
    const [chatwootSavedAt, setChatwootSavedAt] = useState<string | null>(null);
    const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const latestFilesRef = useRef(files);
    const terminalRef = useRef<TerminalPanelHandle>(null);
    const previewAutoRefreshTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    // Keep ref in sync with state
    useEffect(() => {
        latestFilesRef.current = files;
    }, [files]);

    useEffect(() => {
        if (typeof window === "undefined") {
            return;
        }

        const stored = window.localStorage.getItem(LEARNING_MODE_KEY);
        if (stored === "0") {
            setLearningMode(false);
        } else if (stored === "1") {
            setLearningMode(true);
        }
    }, []);

    useEffect(() => {
        if (typeof window === "undefined") {
            return;
        }

        window.localStorage.setItem(LEARNING_MODE_KEY, learningMode ? "1" : "0");
    }, [learningMode]);

    // Load project files from API
    useEffect(() => {
        let mounted = true;

        async function loadProject() {
            try {
                const res = await apiRequest("GET", `/api/projects/${projectId}`);
                const project = await res.json();
                if (mounted) {
                    const loadedFiles = project.files && Object.keys(project.files).length > 0
                        ? project.files
                        : DEFAULT_FILE_CONTENTS;
                    const now = Date.now();
                    const loadedMeta: Record<string, number> = {};
                    for (const path of Object.keys(loadedFiles)) {
                        loadedMeta[path] = now;
                    }
                    setFiles(loadedFiles);
                    setFileLastModified(loadedMeta);
                    setProjectName(project.name || "Untitled Project");
                    const loadedChatwoot = project.integrations?.chatwoot;
                    if (loadedChatwoot) {
                        setChatwootUrl(loadedChatwoot.chatwootUrl || "");
                        setChatwootWebsiteToken(loadedChatwoot.websiteToken || "");
                        setChatwootSavedAt(loadedChatwoot.updatedAt || null);
                    }

                    // Open the first TSX file as default tab
                    const firstTsx = Object.keys(loadedFiles).find((p) => p.endsWith(".tsx"));
                    const firstFile = firstTsx || Object.keys(loadedFiles)[0];
                    if (firstFile) {
                        const name = firstFile.split("/").pop() || firstFile;
                        setTabs([{ name, path: firstFile }]);
                        setActiveTab(firstFile);
                    }

                    setIsLoading(false);
                }
            } catch (error) {
                console.error("Failed to load project:", error);
                if (mounted) {
                    // fallback to defaults
                    setTabs([
                        { name: "Hero.tsx", path: "src/components/Hero.tsx" },
                        { name: "App.tsx", path: "src/App.tsx" },
                    ]);
                    setActiveTab("src/components/Hero.tsx");
                    setIsLoading(false);
                }
            }
        }

        void loadProject();

        return () => {
            mounted = false;
        };
    }, [projectId]);

    // Fetch username from session
    useEffect(() => {
        async function fetchUser() {
            try {
                const res = await apiRequest("GET", "/api/auth/session");
                const data = await res.json();
                if (data.user?.username) {
                    setUsername(data.user.username);
                }
            } catch {
                // ignore
            }
        }
        void fetchUser();
    }, []);

    const handleRunProject = useCallback(() => {
        setIsPreviewOpen(true);
        setPreviewRefreshKey((prev) => prev + 1);
        terminalRef.current?.writeCommand("echo Live preview started using the in-app renderer.");
    }, []);

    const handlePreviewProject = useCallback(() => {
        setIsPreviewOpen((prev) => !prev);
    }, []);

    const configuredChatwoot = useMemo<ChatwootConfig | null>(() => {
        const url = chatwootUrl.trim();
        const token = chatwootWebsiteToken.trim();
        if (!url || !token) {
            return null;
        }
        return {
            chatwootUrl: url,
            websiteToken: token,
        };
    }, [chatwootUrl, chatwootWebsiteToken]);

    const centerPanelDefaultSize = useMemo(() => {
        if (sidebarCollapsed) {
            return isPreviewOpen ? 55 : 75;
        }
        return isPreviewOpen ? 40 : 60;
    }, [sidebarCollapsed, isPreviewOpen]);

    const previewPanelDefaultSize = sidebarCollapsed ? 20 : 20;

    const previewResult = useMemo(
        () => buildPreviewDocument(files, activeTab, configuredChatwoot),
        [files, activeTab, configuredChatwoot],
    );

    const showPreviewToast = useCallback((message: string) => {
        setPreviewToast(message);
        window.setTimeout(() => {
            setPreviewToast((current) => (current === message ? null : current));
        }, 1800);
    }, []);

    const showWorkspaceToast = useCallback((message: string) => {
        const id = Date.now() + Math.floor(Math.random() * 1000);
        setWorkspaceToasts((prev) => [...prev, { id, text: message }]);
        window.setTimeout(() => {
            setWorkspaceToasts((prev) => prev.filter((toast) => toast.id !== id));
        }, 2200);
    }, []);

    const handleSaveChatwootIntegration = useCallback(async () => {
        const payload = {
            projectId,
            chatwootUrl: chatwootUrl.trim(),
            websiteToken: chatwootWebsiteToken.trim(),
        };

        if (!payload.chatwootUrl || !payload.websiteToken) {
            showWorkspaceToast("Chatwoot URL and Website Token are required.");
            return;
        }

        try {
            setChatwootSaving(true);
            const response = await apiRequest("POST", "/api/integrations/chatwoot/configure", payload);
            const data = await response.json();
            if (data.chatwootUrl) {
                setChatwootUrl(data.chatwootUrl);
            }
            if (data.websiteToken) {
                setChatwootWebsiteToken(data.websiteToken);
            }
            setChatwootSavedAt(data.updatedAt || new Date().toISOString());
            showWorkspaceToast("Chatwoot integration saved.");
        } catch (error) {
            const message = error instanceof Error ? error.message : "Failed to save Chatwoot integration.";
            showWorkspaceToast(message);
        } finally {
            setChatwootSaving(false);
        }
    }, [chatwootUrl, chatwootWebsiteToken, projectId, showWorkspaceToast]);

    const handleTestChatwootWidget = useCallback(() => {
        if (!configuredChatwoot) {
            showWorkspaceToast("Configure and save Chatwoot first.");
            return;
        }

        setIsPreviewOpen(true);
        setPreviewRefreshKey((prev) => prev + 1);
        showPreviewToast("Send a test message to verify setup.");
    }, [configuredChatwoot, showPreviewToast, showWorkspaceToast]);

    const handleOpenPreviewInNewTab = useCallback(() => {
        if (!previewResult.html) {
            showPreviewToast("No preview to open");
            return;
        }

        const blob = new Blob([previewResult.html], { type: "text/html" });
        const url = URL.createObjectURL(blob);
        const opened = window.open(url, "_blank", "noopener,noreferrer");
        if (!opened) {
            showPreviewToast("Popup blocked by browser");
        }

        window.setTimeout(() => {
            URL.revokeObjectURL(url);
        }, 60_000);
    }, [previewResult.html, showPreviewToast]);

    const handleCopyPreviewHtml = useCallback(async () => {
        if (!previewResult.html) {
            showPreviewToast("No preview HTML to copy");
            return;
        }

        try {
            await navigator.clipboard.writeText(previewResult.html);
            showPreviewToast("Preview HTML copied");
        } catch {
            showPreviewToast("Copy failed");
        }
    }, [previewResult.html, showPreviewToast]);

    const handleDownloadPreviewHtml = useCallback(() => {
        if (!previewResult.html) {
            showPreviewToast("No preview HTML to download");
            return;
        }

        const blob = new Blob([previewResult.html], { type: "text/html" });
        const url = URL.createObjectURL(blob);
        const anchor = document.createElement("a");
        anchor.href = url;
        anchor.download = `${projectName.replace(/\s+/g, "-").toLowerCase()}-preview.html`;
        anchor.click();
        URL.revokeObjectURL(url);
        showPreviewToast("Preview downloaded");
    }, [previewResult.html, projectName, showPreviewToast]);

    useEffect(() => {
        if (!isPreviewOpen || !activeTab) {
            return;
        }

        if (activeTab.toLowerCase().endsWith(".html")) {
            setPreviewRefreshKey((prev) => prev + 1);
        }
    }, [activeTab, isPreviewOpen]);

    useEffect(() => {
        if (!isPreviewOpen || !isPreviewAutoRefresh) {
            return;
        }

        if (previewAutoRefreshTimerRef.current) {
            clearTimeout(previewAutoRefreshTimerRef.current);
        }

        previewAutoRefreshTimerRef.current = setTimeout(() => {
            setPreviewRefreshKey((prev) => prev + 1);
        }, 250);

        return () => {
            if (previewAutoRefreshTimerRef.current) {
                clearTimeout(previewAutoRefreshTimerRef.current);
            }
        };
    }, [files, isPreviewOpen, isPreviewAutoRefresh]);

    // Auto-save function
    const saveFiles = useCallback(async () => {
        setSaveStatus("saving");
        try {
            await apiRequest("PUT", `/api/projects/${projectId}/files`, {
                files: latestFilesRef.current,
            });
            setSaveStatus("saved");
        } catch (error) {
            console.error("Auto-save failed:", error);
            setSaveStatus("unsaved");
        }
    }, [projectId]);

    // Debounced auto-save when files change (skip initial load)
    const isFirstRender = useRef(true);
    useEffect(() => {
        if (isFirstRender.current) {
            isFirstRender.current = false;
            return;
        }
        if (isLoading || chatStreamingActive) {
            return;
        }

        setSaveStatus("unsaved");

        if (saveTimerRef.current) {
            clearTimeout(saveTimerRef.current);
        }

        saveTimerRef.current = setTimeout(() => {
            void saveFiles();
        }, 2000);

        return () => {
            if (saveTimerRef.current) {
                clearTimeout(saveTimerRef.current);
            }
        };
    }, [files, isLoading, chatStreamingActive, saveFiles]);

    useEffect(() => {
        return () => {
            if (saveTimerRef.current) {
                clearTimeout(saveTimerRef.current);
            }
        };
    }, []);

    const handleFileClick = useCallback(
        (name: string, path: string) => {
            const existingTab = tabs.find((t) => t.path === path);
            if (!existingTab) {
                setTabs((prev) => [...prev, { name, path }]);
            }
            setActiveTab(path);
        },
        [tabs]
    );

    const handleTabClick = useCallback((path: string) => {
        setActiveTab(path);
    }, []);

    const handleTabClose = useCallback(
        (path: string) => {
            setTabs((prev) => {
                const newTabs = prev.filter((t) => t.path !== path);
                if (activeTab === path) {
                    setActiveTab(newTabs.length > 0 ? newTabs[newTabs.length - 1].path : null);
                }
                return newTabs;
            });
        },
        [activeTab]
    );

    const openFileByPath = useCallback((path: string) => {
        const target = files[path];
        if (!target) {
            return false;
        }

        const name = path.split("/").pop() || path;
        handleFileClick(name, path);
        return true;
    }, [files, handleFileClick]);

    const applyEditorChanges = useCallback((changes: EditorChange[]) => {
        if (changes.length === 0) {
            return;
        }

        setFiles((prev) => {
            const next = { ...prev };
            for (const change of changes) {
                next[change.path] = {
                    content: change.content,
                    language: change.language,
                };
            }
            return next;
        });

        setFileLastModified((prev) => {
            const now = Date.now();
            const next = { ...prev };
            for (const change of changes) {
                next[change.path] = now;
            }
            return next;
        });

        setTabs((prev) => {
            const existing = new Set(prev.map((tab) => tab.path));
            const additions: EditorTab[] = [];

            for (const change of changes) {
                if (!existing.has(change.path)) {
                    additions.push({
                        name: change.path.split("/").pop() || change.path,
                        path: change.path,
                        isModified: true,
                    });
                }
            }

            const marked = prev.map((tab) => {
                const changed = changes.some((change) => change.path === tab.path);
                return changed ? { ...tab, isModified: true } : tab;
            });

            return [...marked, ...additions];
        });

        setActiveTab(changes[changes.length - 1].path);

        for (const change of changes) {
            showWorkspaceToast(`Updated ${change.path}`);
        }
    }, [showWorkspaceToast]);

    const handleAddFile = useCallback((fileName: string) => {
        const language = fileName.endsWith(".tsx") || fileName.endsWith(".ts")
            ? "typescript"
            : fileName.endsWith(".css")
            ? "css"
            : fileName.endsWith(".json")
            ? "json"
            : fileName.endsWith(".md")
            ? "markdown"
            : "typescript";

        const filePath = fileName.includes("/") ? fileName : `src/${fileName}`;

        setFiles((prev) => ({
            ...prev,
            [filePath]: { content: "", language },
        }));

        setFileLastModified((prev) => ({
            ...prev,
            [filePath]: Date.now(),
        }));

        setTabs((prev) => [
            ...prev,
            { name: fileName.split("/").pop() || fileName, path: filePath },
        ]);
        setActiveTab(filePath);
    }, []);

    const handleDeleteFile = useCallback((path: string) => {
        setFiles((prev) => {
            const next = { ...prev };
            // Delete the file and any children (for folder delete)
            for (const key of Object.keys(next)) {
                if (key === path || key.startsWith(path + "/")) {
                    delete next[key];
                }
            }
            return next;
        });
        setTabs((prev) => prev.filter((tab) => tab.path !== path && !tab.path.startsWith(path + "/")));
        setFileLastModified((prev) => {
            const next = { ...prev };
            for (const key of Object.keys(next)) {
                if (key === path || key.startsWith(path + "/")) {
                    delete next[key];
                }
            }
            return next;
        });
        setActiveTab((prev) => (prev === path || prev?.startsWith(path + "/")) ? null : prev);
    }, []);

    const handleRenameFile = useCallback((oldPath: string, newPath: string) => {
        setFiles((prev) => {
            const next = { ...prev };
            // Handle single file or folder rename (update all paths under the old path)
            for (const key of Object.keys(next)) {
                if (key === oldPath) {
                    next[newPath] = next[key];
                    delete next[key];
                } else if (key.startsWith(oldPath + "/")) {
                    const suffix = key.substring(oldPath.length);
                    next[newPath + suffix] = next[key];
                    delete next[key];
                }
            }
            return next;
        });
        setTabs((prev) => prev.map((tab) => {
            if (tab.path === oldPath) return { ...tab, name: newPath.split("/").pop() || newPath, path: newPath };
            if (tab.path.startsWith(oldPath + "/")) {
                const suffix = tab.path.substring(oldPath.length);
                const np = newPath + suffix;
                return { ...tab, name: np.split("/").pop() || np, path: np };
            }
            return tab;
        }));
        setFileLastModified((prev) => {
            const next = { ...prev };
            const now = Date.now();
            for (const key of Object.keys(prev)) {
                if (key === oldPath) {
                    next[newPath] = now;
                    delete next[key];
                } else if (key.startsWith(oldPath + "/")) {
                    const suffix = key.substring(oldPath.length);
                    next[newPath + suffix] = now;
                    delete next[key];
                }
            }
            return next;
        });
        setActiveTab((prev) => {
            if (prev === oldPath) return newPath;
            if (prev?.startsWith(oldPath + "/")) return newPath + prev.substring(oldPath.length);
            return prev;
        });
    }, []);

    const handleDuplicateFile = useCallback((path: string) => {
        let duplicatedPath = "";
        setFiles((prev) => {
            const source = prev[path];
            if (!source) {
                return prev;
            }

            const dotIndex = path.lastIndexOf(".");
            const hasExtension = dotIndex > path.lastIndexOf("/");
            const base = hasExtension ? path.slice(0, dotIndex) : path;
            const ext = hasExtension ? path.slice(dotIndex) : "";

            let candidate = `${base}-copy${ext}`;
            let counter = 2;
            while (prev[candidate]) {
                candidate = `${base}-copy-${counter}${ext}`;
                counter += 1;
            }

            duplicatedPath = candidate;

            return {
                ...prev,
                [candidate]: {
                    content: source.content,
                    language: source.language,
                },
            };
        });

        if (duplicatedPath) {
            setFileLastModified((prev) => ({
                ...prev,
                [duplicatedPath]: Date.now(),
            }));
        }

        setTabs((prev) => {
            const dotIndex = path.lastIndexOf(".");
            const hasExtension = dotIndex > path.lastIndexOf("/");
            const base = hasExtension ? path.slice(0, dotIndex) : path;
            const ext = hasExtension ? path.slice(dotIndex) : "";

            const existingPaths = new Set([...Object.keys(files), ...prev.map((tab) => tab.path)]);
            let candidate = `${base}-copy${ext}`;
            let counter = 2;
            while (existingPaths.has(candidate)) {
                candidate = `${base}-copy-${counter}${ext}`;
                counter += 1;
            }

            const name = candidate.split("/").pop() || candidate;
            return [...prev, { name, path: candidate, isModified: true }];
        });

        setActiveTab((prev) => {
            const dotIndex = path.lastIndexOf(".");
            const hasExtension = dotIndex > path.lastIndexOf("/");
            const base = hasExtension ? path.slice(0, dotIndex) : path;
            const ext = hasExtension ? path.slice(dotIndex) : "";

            let candidate = `${base}-copy${ext}`;
            let counter = 2;
            const existingPaths = new Set(Object.keys(files));
            while (existingPaths.has(candidate)) {
                candidate = `${base}-copy-${counter}${ext}`;
                counter += 1;
            }

            return candidate;
        });
    }, [files]);

    const handleAddFileWithContent = useCallback((fileName: string, content: string) => {
        const language = fileName.endsWith(".html")
            ? "html"
            : fileName.endsWith(".css")
            ? "css"
            : fileName.endsWith(".json")
            ? "json"
            : "html";
        const filePath = fileName.includes("/") ? fileName : `src/${fileName}`;
        setFiles((prev) => ({
            ...prev,
            [filePath]: { content, language },
        }));
        setFileLastModified((prev) => ({
            ...prev,
            [filePath]: Date.now(),
        }));
        setTabs((prev) => [
            ...prev,
            { name: fileName.split("/").pop() || fileName, path: filePath },
        ]);
        setActiveTab(filePath);
    }, []);

    const handleRenameProject = useCallback(
        async (newName: string) => {
            setProjectName(newName);
            try {
                await apiRequest("PATCH", `/api/projects/${projectId}`, { name: newName });
            } catch (error) {
                console.error("Failed to rename project:", error);
            }
        },
        [projectId]
    );

    useEffect(() => {
        const handleQuickOpen = () => {
            const allPaths = Object.keys(files);
            if (allPaths.length === 0) {
                return;
            }

            const hint = allPaths.slice(0, 8).join("\n");
            const query = window.prompt(
                `Quick Open: enter a file path or partial name.\n\nExamples:\n${hint}`,
            );

            if (!query) {
                return;
            }

            const trimmed = query.trim();
            if (!trimmed) {
                return;
            }

            if (openFileByPath(trimmed)) {
                return;
            }

            const lower = trimmed.toLowerCase();
            const fuzzy = allPaths.find((path) => path.toLowerCase().includes(lower));
            if (fuzzy) {
                openFileByPath(fuzzy);
                return;
            }

            window.alert("No matching file found.");
        };

        const handleFocusTerminal = () => {
            terminalRef.current?.focus();
            const terminalElement = document.querySelector("[data-terminal-container]");
            if (terminalElement) {
                terminalElement.scrollIntoView({ behavior: "smooth", block: "nearest" });
            }
        };

        window.addEventListener("synapse:quick-open-file", handleQuickOpen);
        window.addEventListener("synapse:focus-terminal", handleFocusTerminal);

        return () => {
            window.removeEventListener("synapse:quick-open-file", handleQuickOpen);
            window.removeEventListener("synapse:focus-terminal", handleFocusTerminal);
        };
    }, [files, openFileByPath]);

    const activeFilePath = activeTab || null;
    const activeFileContent = activeFilePath ? files[activeFilePath]?.content || "" : "";
    const otherFileSummaries = useMemo(() => {
        return Object.entries(files)
            .filter(([path]) => path !== activeFilePath)
            .map(([path, file]) => ({
                path,
                lineCount: file.content.length > 0 ? file.content.split("\n").length : 0,
                lastModified: fileLastModified[path] || 0,
            }));
    }, [files, fileLastModified, activeFilePath]);

    const handleChatStreamStart = useCallback(() => {
        setChatStreamingActive(true);
        setStreamToken(null);
    }, []);

    const handleChatStreamToken = useCallback((token: string) => {
        setStreamToken(token);
        setStreamTokenSeq((prev) => prev + 1);
    }, []);

    const handleChatStreamEnd = useCallback(() => {
        setChatStreamingActive(false);
        setStreamCommitSeq((prev) => prev + 1);
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
                        yield JSON.parse(line) as { token?: string; done?: boolean; error?: string; mode?: ScreenshotCloneMode };
                    } catch {
                        // Ignore malformed events.
                    }
                }
            }
        }
    }, []);

    const ensureScreenshotCloneFile = useCallback(() => {
        const path = "screenshot-clone.html";
        setFiles((prev) => {
            if (prev[path]) {
                return prev;
            }
            return {
                ...prev,
                [path]: { content: "", language: "html" },
            };
        });
        setFileLastModified((prev) => ({
            ...prev,
            [path]: Date.now(),
        }));
        setTabs((prev) => {
            if (prev.some((tab) => tab.path === path)) {
                return prev;
            }
            return [...prev, { name: "screenshot-clone.html", path }];
        });
        setActiveTab(path);
        return path;
    }, []);

    const streamScreenshotClone = useCallback(async (
        file: File,
        mode: ScreenshotCloneMode,
        instruction = "",
    ) => {
        const targetPath = ensureScreenshotCloneFile();
        const token = getAuthToken();
        const formData = new FormData();
        formData.append("image", file);
        formData.append("mode", mode);
        if (mode === "iterate") {
            formData.append("instruction", instruction);
            formData.append("currentHtml", files[targetPath]?.content || "");
        }

        const response = await fetch("/api/clone-screenshot", {
            method: "POST",
            headers: token ? { Authorization: `Bearer ${token}` } : undefined,
            body: formData,
        });

        if (!response.ok) {
            const text = await response.text();
            throw new Error(text || "Screenshot clone failed");
        }

        if (mode === "initial") {
            setFiles((prev) => ({
                ...prev,
                [targetPath]: { content: "", language: "html" },
            }));
        }

        let streamedText = "";
        for await (const event of readSseEvents(response)) {
            if (event.error) {
                throw new Error(event.error);
            }

            if (event.token) {
                streamedText += event.token;
                if (mode === "initial") {
                    setFiles((prev) => ({
                        ...prev,
                        [targetPath]: {
                            content: (prev[targetPath]?.content || "") + event.token,
                            language: "html",
                        },
                    }));
                    setFileLastModified((prev) => ({
                        ...prev,
                        [targetPath]: Date.now(),
                    }));
                } else {
                    setScreenshotIterateDiff(streamedText);
                }
            }
        }

        if (mode === "iterate") {
            const diffBlock = extractFirstDiffBlock(streamedText) || streamedText;
            const before = files[targetPath]?.content || "";
            const next = applyUnifiedDiffToContent(before, diffBlock);
            if (next) {
                setFiles((prev) => ({
                    ...prev,
                    [targetPath]: { content: next, language: "html" },
                }));
                setFileLastModified((prev) => ({
                    ...prev,
                    [targetPath]: Date.now(),
                }));
                setScreenshotStatus("Iteration applied.");
            } else {
                setScreenshotStatus("Iteration returned a patch that could not be applied.");
            }
        }
    }, [ensureScreenshotCloneFile, files, readSseEvents]);

    const handleScreenshotSelected = useCallback(async (file: File) => {
        const isAllowed = ["image/png", "image/jpeg", "image/jpg"].includes(file.type.toLowerCase());
        if (!isAllowed) {
            setScreenshotStatus("Only PNG/JPG images are supported.");
            return;
        }
        if (file.size > 5 * 1024 * 1024) {
            setScreenshotStatus("Image exceeds 5MB limit.");
            return;
        }

        const reader = new FileReader();
        const dataUrl = await new Promise<string>((resolve, reject) => {
            reader.onload = () => resolve(String(reader.result || ""));
            reader.onerror = () => reject(new Error("Failed to read image file"));
            reader.readAsDataURL(file);
        });

        setScreenshotFile(file);
        setScreenshotImageDataUrl(dataUrl);
        setScreenshotPanelOpen(true);
        setScreenshotOverlayOpen(false);
        setScreenshotStatus("Generating HTML clone...");
        setScreenshotIterateDiff("");

        try {
            setScreenshotGenerating(true);
            await streamScreenshotClone(file, "initial");
            setScreenshotStatus("Clone completed.");
        } catch (error) {
            const message = error instanceof Error ? error.message : "Clone failed";
            setScreenshotStatus(message);
        } finally {
            setScreenshotGenerating(false);
        }
    }, [streamScreenshotClone]);

    const handleScreenshotIterate = useCallback(async () => {
        if (!screenshotFile || !screenshotIterateInstruction.trim()) {
            return;
        }

        try {
            setScreenshotIterating(true);
            setScreenshotStatus("Applying iteration...");
            setScreenshotIterateDiff("");
            await streamScreenshotClone(screenshotFile, "iterate", screenshotIterateInstruction.trim());
        } catch (error) {
            const message = error instanceof Error ? error.message : "Iteration failed";
            setScreenshotStatus(message);
        } finally {
            setScreenshotIterating(false);
        }
    }, [screenshotFile, screenshotIterateInstruction, streamScreenshotClone]);

    const toggleAnalysisSection = useCallback((key: string) => {
        setAnalysisCollapsed((prev) => ({
            ...prev,
            [key]: !prev[key],
        }));
    }, []);

    const triggerBuildFeatureFromAnalysis = useCallback((suggestion: string) => {
        const prompt = `Implement this competitor-outperforming feature in my current project: ${suggestion}. Provide concrete UI and code changes.`;
        setChatPrefillPrompt(prompt);
        setChatPrefillSeq((prev) => prev + 1);
    }, []);

    if (isLoading) {
        return (
            <div className="h-screen w-screen flex items-center justify-center bg-[hsl(240,10%,3%)]">
                <div className="flex items-center gap-3 text-muted-foreground">
                    <Loader2 className="w-5 h-5 animate-spin" />
                    <span className="text-sm">Loading project...</span>
                </div>
            </div>
        );
    }

    return (
        <div className="h-screen w-screen flex flex-col overflow-hidden bg-[hsl(240,10%,3%)]">
            {/* Top Bar */}
            <TopBar
                sidebarCollapsed={sidebarCollapsed}
                onToggleSidebar={() => setSidebarCollapsed(!sidebarCollapsed)}
                projectName={projectName}
                onRenameProject={handleRenameProject}
                saveStatus={saveStatus}
                username={username}
                onRunProject={handleRunProject}
                onPreviewProject={handlePreviewProject}
                isPreviewOpen={isPreviewOpen}
                tokenEstimate={tokenEstimate}
                learningMode={learningMode}
                onToggleLearningMode={() => setLearningMode((prev) => !prev)}
                onUploadScreenshot={() => setScreenshotOverlayOpen(true)}
                chatwootConfig={configuredChatwoot}
            />

            {/* Main content area */}
            <ResizablePanelGroup direction="horizontal" className="flex-1">
                {/* File Explorer Sidebar */}
                {!sidebarCollapsed && (
                    <>
                        <ResizablePanel defaultSize={15} minSize={12} maxSize={25} className="min-w-0">
                            <div className="h-full flex flex-col bg-[hsl(240,10%,4%)]">
                                <div className="px-2 pt-2 border-b border-[hsl(240,5%,12%)]">
                                    <div className="grid grid-cols-2 gap-1 rounded-md bg-[hsl(240,10%,6%)] p-1">
                                        <button
                                            onClick={() => setSidePanelTab("explorer")}
                                            className={`rounded px-2 py-1 text-[11px] font-medium transition-colors ${sidePanelTab === "explorer"
                                                ? "bg-primary/20 text-primary"
                                                : "text-muted-foreground hover:text-foreground"
                                                }`}
                                        >
                                            Explorer
                                        </button>
                                        <button
                                            onClick={() => setSidePanelTab("integrations")}
                                            className={`rounded px-2 py-1 text-[11px] font-medium transition-colors ${sidePanelTab === "integrations"
                                                ? "bg-primary/20 text-primary"
                                                : "text-muted-foreground hover:text-foreground"
                                                }`}
                                        >
                                            Integrations
                                        </button>
                                    </div>
                                </div>

                                {sidePanelTab === "explorer" ? (
                                    <PanelErrorBoundary>
                                        <MemoFileExplorer
                                            activeFile={activeTab}
                                            onFileClick={handleFileClick}
                                            files={files}
                                            onAddFile={handleAddFile}
                                            onAddFileWithContent={handleAddFileWithContent}
                                            onDuplicateFile={handleDuplicateFile}
                                            onDeleteFile={handleDeleteFile}
                                            onRenameFile={handleRenameFile}
                                            onCloneResult={(result) => {
                                                if (result.analysis) {
                                                    setAnalysisData(result.analysis);
                                                    setAnalysisSourceTitle(result.title || result.url);
                                                    setAnalysisPanelOpen(true);
                                                }
                                            }}
                                        />
                                    </PanelErrorBoundary>
                                ) : (
                                    <div className="flex-1 overflow-auto p-3">
                                        <div className="rounded-lg border border-[hsl(240,5%,14%)] bg-[hsl(240,10%,6%)] p-3 space-y-3">
                                            <div>
                                                <div className="text-sm font-semibold text-foreground">Chatwoot</div>
                                                <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">
                                                    Configure Chatwoot live chat for this project.
                                                </p>
                                            </div>

                                            <div className="space-y-1">
                                                <label className="text-[11px] text-muted-foreground">Chatwoot URL</label>
                                                <input
                                                    type="url"
                                                    value={chatwootUrl}
                                                    onChange={(e) => setChatwootUrl(e.target.value)}
                                                    placeholder="https://app.chatwoot.com"
                                                    className="w-full rounded border border-[hsl(240,5%,14%)] bg-[hsl(240,10%,5%)] px-2 py-1.5 text-xs text-foreground outline-none focus:border-primary/50"
                                                />
                                            </div>

                                            <div className="space-y-1">
                                                <label className="text-[11px] text-muted-foreground">Website Token</label>
                                                <input
                                                    type="text"
                                                    value={chatwootWebsiteToken}
                                                    onChange={(e) => setChatwootWebsiteToken(e.target.value)}
                                                    placeholder="Paste website token"
                                                    className="w-full rounded border border-[hsl(240,5%,14%)] bg-[hsl(240,10%,5%)] px-2 py-1.5 text-xs text-foreground outline-none focus:border-primary/50"
                                                />
                                            </div>

                                            <div className="flex items-center gap-2">
                                                <button
                                                    onClick={() => { void handleSaveChatwootIntegration(); }}
                                                    disabled={chatwootSaving}
                                                    className="rounded border border-primary/40 bg-primary/15 px-3 py-1.5 text-xs text-primary hover:bg-primary/25 disabled:opacity-60"
                                                >
                                                    {chatwootSaving ? "Saving..." : "Save"}
                                                </button>
                                                <button
                                                    onClick={handleTestChatwootWidget}
                                                    className="rounded border border-[hsl(240,5%,14%)] px-3 py-1.5 text-xs text-foreground hover:bg-[hsl(240,5%,12%)]"
                                                >
                                                    Test widget
                                                </button>
                                            </div>

                                            <p className="text-[11px] text-muted-foreground">
                                                Send a test message to verify setup.
                                            </p>

                                            {chatwootSavedAt && (
                                                <p className="text-[10px] text-muted-foreground/80">
                                                    Saved: {new Date(chatwootSavedAt).toLocaleString()}
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </ResizablePanel>
                        <ResizableHandle className="w-px bg-[hsl(240,5%,12%)] hover:bg-primary/50 transition-colors data-resize-handle-active:bg-primary" />
                    </>
                )}

                {/* Center: Editor + Terminal */}
                <ResizablePanel defaultSize={centerPanelDefaultSize} minSize={30}>
                    <ResizablePanelGroup direction="vertical">
                        {/* Editor */}
                        <ResizablePanel defaultSize={70} minSize={30}>
                            <PanelErrorBoundary>
                                <MemoEditorPanel
                                    tabs={tabs}
                                    activeTab={activeTab}
                                    onTabClick={handleTabClick}
                                    onTabClose={handleTabClose}
                                    files={files}
                                    streamActive={chatStreamingActive}
                                    streamToken={streamToken}
                                    streamTokenSeq={streamTokenSeq}
                                    streamCommitSeq={streamCommitSeq}
                                    onFileChange={(path, content) => {
                                        setFiles((prev) => ({
                                            ...prev,
                                            [path]: {
                                                ...prev[path],
                                                content,
                                            },
                                        }));
                                        setFileLastModified((prev) => ({
                                            ...prev,
                                            [path]: Date.now(),
                                        }));

                                        setTabs((prev) =>
                                            prev.map((tab) =>
                                                tab.path === path ? { ...tab, isModified: true } : tab
                                            )
                                        );
                                    }}
                                />
                            </PanelErrorBoundary>
                        </ResizablePanel>
                        <ResizableHandle className="h-px bg-[hsl(240,5%,12%)] hover:bg-primary/50 transition-colors data-resize-handle-active:bg-primary" />
                        {/* Terminal */}
                        <ResizablePanel defaultSize={30} minSize={15} maxSize={50}>
                            <PanelErrorBoundary>
                                <MemoTerminalPanel ref={terminalRef} />
                            </PanelErrorBoundary>
                        </ResizablePanel>
                    </ResizablePanelGroup>
                </ResizablePanel>

                {/* Preview Panel (when open) */}
                {isPreviewOpen && (
                    <>
                        <ResizableHandle className="w-px bg-[hsl(240,5%,12%)] hover:bg-primary/50 transition-colors data-resize-handle-active:bg-primary" />
                        <ResizablePanel defaultSize={previewPanelDefaultSize} minSize={20} maxSize={50}>
                            <div className="h-full flex flex-col bg-[hsl(240,10%,4%)]">
                                <div className="flex items-center justify-between px-3 py-2 border-b border-[hsl(240,5%,12%)] bg-[hsl(240,10%,5%)]">
                                    <div className="flex items-center gap-2">
                                        <MonitorPlay className="w-3.5 h-3.5 text-primary" />
                                        <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Preview</span>
                                        {previewResult.message && (
                                            <span className="text-[10px] px-1.5 py-0.5 rounded border border-amber-500/30 bg-amber-500/10 text-amber-300">
                                                Fallback
                                            </span>
                                        )}
                                    </div>
                                    <div className="flex items-center gap-2">
                                        {previewResult.entryPath && (
                                            <span className="text-[10px] text-muted-foreground/70 max-w-[170px] truncate" title={previewResult.entryPath}>
                                                {previewResult.entryPath}
                                            </span>
                                        )}
                                        <div className="flex items-center gap-1 p-0.5 rounded border border-[hsl(240,5%,16%)] bg-[hsl(240,10%,6%)]">
                                            <button
                                                onClick={() => setPreviewViewport("responsive")}
                                                className={`px-1.5 py-0.5 rounded text-[10px] transition-colors ${previewViewport === "responsive"
                                                    ? "bg-primary/20 text-primary"
                                                    : "text-muted-foreground hover:text-foreground"
                                                    }`}
                                                title="Responsive width"
                                            >
                                                Auto
                                            </button>
                                            <button
                                                onClick={() => setPreviewViewport("desktop")}
                                                className={`p-1 rounded transition-colors ${previewViewport === "desktop"
                                                    ? "bg-primary/20 text-primary"
                                                    : "text-muted-foreground hover:text-foreground"
                                                    }`}
                                                title="Desktop"
                                            >
                                                <Monitor className="w-3 h-3" />
                                            </button>
                                            <button
                                                onClick={() => setPreviewViewport("tablet")}
                                                className={`p-1 rounded transition-colors ${previewViewport === "tablet"
                                                    ? "bg-primary/20 text-primary"
                                                    : "text-muted-foreground hover:text-foreground"
                                                    }`}
                                                title="Tablet"
                                            >
                                                <Tablet className="w-3 h-3" />
                                            </button>
                                            <button
                                                onClick={() => setPreviewViewport("mobile")}
                                                className={`p-1 rounded transition-colors ${previewViewport === "mobile"
                                                    ? "bg-primary/20 text-primary"
                                                    : "text-muted-foreground hover:text-foreground"
                                                    }`}
                                                title="Mobile"
                                            >
                                                <Smartphone className="w-3 h-3" />
                                            </button>
                                        </div>
                                        <button
                                            onClick={() => setIsPreviewAutoRefresh((prev) => !prev)}
                                            className={`px-2 py-1 rounded text-[10px] border transition-colors ${isPreviewAutoRefresh
                                                ? "border-emerald-500/40 text-emerald-300 bg-emerald-500/10"
                                                : "border-[hsl(240,5%,16%)] text-muted-foreground hover:text-foreground"
                                                }`}
                                            title="Toggle auto refresh"
                                        >
                                            Auto
                                        </button>
                                        <button
                                            onClick={() => setPreviewRefreshKey((prev) => prev + 1)}
                                            className="px-2 py-1 rounded text-[10px] border border-[hsl(240,5%,16%)] text-muted-foreground hover:text-foreground hover:bg-[hsl(240,5%,15%)] transition-colors"
                                            title="Refresh preview"
                                        >
                                            Refresh
                                        </button>
                                        <button
                                            onClick={() => {
                                                void handleCopyPreviewHtml();
                                            }}
                                            className="p-1 rounded border border-[hsl(240,5%,16%)] text-muted-foreground hover:text-foreground hover:bg-[hsl(240,5%,15%)] transition-colors"
                                            title="Copy preview HTML"
                                        >
                                            <Copy className="w-3 h-3" />
                                        </button>
                                        <button
                                            onClick={handleDownloadPreviewHtml}
                                            className="p-1 rounded border border-[hsl(240,5%,16%)] text-muted-foreground hover:text-foreground hover:bg-[hsl(240,5%,15%)] transition-colors"
                                            title="Download preview HTML"
                                        >
                                            <Download className="w-3 h-3" />
                                        </button>
                                        <button
                                            onClick={handleOpenPreviewInNewTab}
                                            className="p-1 rounded border border-[hsl(240,5%,16%)] text-muted-foreground hover:text-foreground hover:bg-[hsl(240,5%,15%)] transition-colors"
                                            title="Open preview in new tab"
                                        >
                                            <ExternalLink className="w-3 h-3" />
                                        </button>
                                        <button
                                            onClick={() => setIsPreviewOpen(false)}
                                            className="p-1 rounded hover:bg-[hsl(240,5%,15%)] text-muted-foreground hover:text-foreground transition-colors"
                                        >
                                            <X className="w-3 h-3" />
                                        </button>
                                    </div>
                                </div>
                                <div className="flex-1 min-h-0 bg-[hsl(240,10%,3%)]">
                                    {previewToast && (
                                        <div className="absolute right-3 top-14 z-10 text-[11px] rounded-md border border-[hsl(240,5%,18%)] bg-[hsl(240,10%,8%)] px-2.5 py-1.5 text-foreground shadow-lg">
                                            {previewToast}
                                        </div>
                                    )}
                                    {previewResult.html ? (
                                        <div className="h-full w-full overflow-auto flex items-start justify-center p-2">
                                            <div
                                                className={`min-h-full bg-white shadow-2xl border border-[hsl(240,5%,14%)] ${previewViewport === "desktop"
                                                    ? "w-[1280px]"
                                                    : previewViewport === "tablet"
                                                        ? "w-[820px]"
                                                        : previewViewport === "mobile"
                                                            ? "w-[390px]"
                                                            : "w-full"
                                                    }`}
                                            >
                                                <iframe
                                                    key={`${previewRefreshKey}-${previewResult.entryPath ?? "preview"}-${previewViewport}`}
                                                    title="Project preview"
                                                    srcDoc={previewResult.html}
                                                    sandbox="allow-scripts allow-forms allow-modals allow-popups"
                                                    className="h-full min-h-[720px] w-full bg-white"
                                                />
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="h-full flex flex-col items-center justify-center p-6 text-center">
                                            <MonitorPlay className="w-12 h-12 text-muted-foreground/20 mb-4" />
                                            <h3 className="text-sm font-medium text-foreground mb-1">Preview unavailable</h3>
                                            <p className="text-xs text-muted-foreground max-w-[260px] leading-relaxed">
                                                {previewResult.message || "No preview content available yet."}
                                            </p>
                                            <div className="mt-4 flex flex-col gap-2 w-full max-w-[220px]">
                                                <div className="rounded-lg bg-[hsl(240,10%,7%)] border border-[hsl(240,5%,14%)] p-3">
                                                    <div className="text-[10px] text-muted-foreground/60 mb-1">PROJECT</div>
                                                    <div className="text-xs font-medium text-foreground truncate">{projectName}</div>
                                                </div>
                                                <div className="rounded-lg bg-[hsl(240,10%,7%)] border border-[hsl(240,5%,14%)] p-3">
                                                    <div className="text-[10px] text-muted-foreground/60 mb-1">FILES</div>
                                                    <div className="text-xs font-medium text-foreground">{Object.keys(files).length} files</div>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </ResizablePanel>
                    </>
                )}

                {/* AI Chat Panel */}
                <ResizableHandle className="w-px bg-[hsl(240,5%,12%)] hover:bg-primary/50 transition-colors data-resize-handle-active:bg-primary" />
                <ResizablePanel defaultSize={25} minSize={18} maxSize={40}>
                    <PanelErrorBoundary>
                        <MemoAIChatPanel
                            onApplyToEditor={applyEditorChanges}
                            getFileContent={(path) => files[path]?.content}
                            activeFilePath={activeFilePath}
                            activeFileContent={activeFileContent}
                            otherFileSummaries={otherFileSummaries}
                            onTokenEstimateChange={setTokenEstimate}
                            onStreamStart={handleChatStreamStart}
                            onStreamTokenToEditor={handleChatStreamToken}
                            onStreamEnd={handleChatStreamEnd}
                            autoStartVoice={initialVoiceMode}
                            projectId={projectId}
                            learningMode={learningMode}
                            prefillPrompt={chatPrefillPrompt}
                            prefillPromptSeq={chatPrefillSeq}
                        />
                    </PanelErrorBoundary>
                </ResizablePanel>
            </ResizablePanelGroup>

            {analysisPanelOpen && analysisData && (
                <div className="fixed right-3 top-16 z-50 w-[360px] max-h-[calc(100vh-100px)] overflow-hidden rounded-xl border border-[hsl(240,5%,16%)] bg-[hsl(240,10%,6%)] shadow-2xl">
                    <div className="flex items-center justify-between border-b border-[hsl(240,5%,14%)] px-3 py-2">
                        <div className="flex items-center gap-2">
                            <Brain className="h-4 w-4 text-primary" />
                            <div>
                                <div className="text-xs font-semibold text-foreground">Competitor Analysis</div>
                                <div className="max-w-[250px] truncate text-[10px] text-muted-foreground">{analysisSourceTitle || "Website"}</div>
                            </div>
                        </div>
                        <button
                            onClick={() => setAnalysisPanelOpen(false)}
                            className="rounded p-1 text-muted-foreground hover:bg-[hsl(240,5%,14%)] hover:text-foreground"
                        >
                            <X className="h-4 w-4" />
                        </button>
                    </div>
                    <div className="max-h-[calc(100vh-155px)] overflow-auto p-3 space-y-3">
                        {[
                            { key: "proposition", title: "Core Value Proposition", body: analysisData.proposition ? [analysisData.proposition] : [] },
                            { key: "strengths", title: "UX Strengths", body: analysisData.strengths || [] },
                            { key: "weaknesses", title: "UX Weaknesses", body: analysisData.weaknesses || [] },
                            { key: "gaps", title: "Missing Features / Gaps", body: analysisData.gaps || [] },
                            { key: "improvements", title: "Improvements To Outperform", body: analysisData.improvements || [] },
                        ].map((section) => {
                            const collapsed = Boolean(analysisCollapsed[section.key]);
                            return (
                                <div key={section.key} className="rounded-lg border border-[hsl(240,5%,14%)] bg-[hsl(240,10%,5%)]">
                                    <button
                                        onClick={() => toggleAnalysisSection(section.key)}
                                        className="flex w-full items-center justify-between px-3 py-2 text-left text-xs font-medium text-foreground hover:bg-[hsl(240,5%,12%)]"
                                    >
                                        <span>{section.title}</span>
                                        {collapsed ? <ChevronRight className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                                    </button>
                                    {!collapsed && (
                                        <div className="border-t border-[hsl(240,5%,14%)] px-3 py-2 space-y-2">
                                            {section.body.length === 0 ? (
                                                <p className="text-[11px] text-muted-foreground">No findings.</p>
                                            ) : (
                                                section.body.map((item, idx) => (
                                                    <div key={`${section.key}-${idx}`} className="space-y-1">
                                                        <p className="text-[11px] leading-relaxed text-foreground/90">{item}</p>
                                                        {section.key === "improvements" && (
                                                            <button
                                                                onClick={() => triggerBuildFeatureFromAnalysis(item)}
                                                                className="rounded border border-primary/40 bg-primary/15 px-2 py-1 text-[10px] text-primary hover:bg-primary/25"
                                                            >
                                                                Build this feature
                                                            </button>
                                                        )}
                                                    </div>
                                                ))
                                            )}
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {screenshotOverlayOpen && (
                <div
                    className="fixed inset-0 z-[60] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4"
                    onDragOver={(e) => {
                        e.preventDefault();
                        setIsScreenshotDragActive(true);
                    }}
                    onDragLeave={(e) => {
                        e.preventDefault();
                        setIsScreenshotDragActive(false);
                    }}
                    onDrop={(e) => {
                        e.preventDefault();
                        setIsScreenshotDragActive(false);
                        const file = e.dataTransfer.files?.[0];
                        if (file) {
                            void handleScreenshotSelected(file);
                        }
                    }}
                >
                    <div className={`w-full max-w-xl rounded-xl border p-6 bg-[hsl(240,10%,7%)] ${isScreenshotDragActive ? "border-primary" : "border-[hsl(240,5%,16%)]"}`}>
                        <div className="flex items-center justify-between mb-3">
                            <h3 className="text-sm font-semibold text-foreground">Upload Screenshot</h3>
                            <button
                                onClick={() => setScreenshotOverlayOpen(false)}
                                className="p-1 rounded text-muted-foreground hover:text-foreground hover:bg-[hsl(240,5%,14%)]"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </div>
                        <p className="text-xs text-muted-foreground mb-4">Drag and drop PNG/JPG here, or choose a file.</p>
                        <input
                            type="file"
                            accept="image/png,image/jpeg,image/jpg"
                            onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) {
                                    void handleScreenshotSelected(file);
                                }
                            }}
                            className="block w-full text-xs text-foreground"
                        />
                    </div>
                </div>
            )}

            {screenshotPanelOpen && screenshotImageDataUrl && (
                <div className="fixed inset-x-3 bottom-8 top-16 z-40 rounded-xl border border-[hsl(240,5%,16%)] bg-[hsl(240,10%,6%)] shadow-2xl overflow-hidden">
                    <div className="flex items-center justify-between border-b border-[hsl(240,5%,14%)] px-3 py-2">
                        <div className="text-xs font-semibold text-foreground">Screenshot Clone Studio</div>
                        <div className="flex items-center gap-2">
                            {screenshotStatus && <span className="text-[10px] text-muted-foreground">{screenshotStatus}</span>}
                            <button
                                onClick={() => setScreenshotPanelOpen(false)}
                                className="p-1 rounded text-muted-foreground hover:text-foreground hover:bg-[hsl(240,5%,14%)]"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </div>
                    </div>
                    <div className="grid h-[calc(100%-96px)] grid-cols-1 md:grid-cols-2">
                        <div className="border-r border-[hsl(240,5%,14%)] p-3 overflow-auto">
                            <div className="text-[11px] uppercase tracking-wider text-muted-foreground mb-2">Screenshot</div>
                            <img src={screenshotImageDataUrl} alt="Uploaded screenshot" className="w-full h-auto rounded border border-[hsl(240,5%,14%)]" />
                        </div>
                        <div className="p-3 overflow-auto">
                            <div className="text-[11px] uppercase tracking-wider text-muted-foreground mb-2">Generated HTML Preview</div>
                            <iframe
                                title="Screenshot clone preview"
                                srcDoc={files["screenshot-clone.html"]?.content || ""}
                                sandbox="allow-scripts allow-forms"
                                className="w-full h-[70%] min-h-[300px] rounded border border-[hsl(240,5%,14%)] bg-white"
                            />
                            <div className="mt-3 space-y-2">
                                <div className="text-[11px] uppercase tracking-wider text-muted-foreground">Iterate</div>
                                <div className="flex gap-2">
                                    <input
                                        type="text"
                                        value={screenshotIterateInstruction}
                                        onChange={(e) => setScreenshotIterateInstruction(e.target.value)}
                                        placeholder="make the header taller"
                                        className="flex-1 rounded border border-[hsl(240,5%,14%)] bg-[hsl(240,10%,5%)] px-2 py-1.5 text-xs text-foreground"
                                    />
                                    <button
                                        onClick={() => { void handleScreenshotIterate(); }}
                                        disabled={screenshotIterating || screenshotGenerating}
                                        className="rounded border border-primary/40 bg-primary/15 px-3 py-1.5 text-xs text-primary hover:bg-primary/25 disabled:opacity-50"
                                    >
                                        {screenshotIterating ? "Iterating..." : "Iterate"}
                                    </button>
                                </div>
                                {screenshotIterateDiff && (
                                    <pre className="max-h-28 overflow-auto rounded border border-[hsl(240,5%,14%)] bg-[hsl(240,10%,5%)] p-2 text-[10px] text-foreground/80">
                                        <code>{screenshotIterateDiff}</code>
                                    </pre>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {workspaceToasts.length > 0 && (
                <div className="pointer-events-none fixed bottom-10 right-4 z-50 flex flex-col gap-2">
                    {workspaceToasts.map((toast) => (
                        <div
                            key={toast.id}
                            className="rounded-md border border-[hsl(240,5%,16%)] bg-[hsl(240,10%,8%)] px-3 py-2 text-xs text-foreground shadow-lg"
                        >
                            {toast.text}
                        </div>
                    ))}
                </div>
            )}

            {/* Status Bar */}
            <div className="h-6 bg-[hsl(240,10%,5%)] border-t border-[hsl(240,5%,12%)] flex items-center justify-between px-3 text-[11px] text-muted-foreground select-none shrink-0">
                <div className="flex items-center gap-3">
                    <div className="flex items-center gap-1.5">
                        <GitBranch className="w-3 h-3" />
                        <span>main</span>
                    </div>
                    <div className="flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                        <span>0 errors</span>
                    </div>
                    <div className="flex items-center gap-1">
                        <AlertCircle className="w-3 h-3 text-yellow-500" />
                        <span>0 warnings</span>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    <div className="flex items-center gap-1.5">
                        {saveStatus === "saving" ? (
                            <>
                                <Loader2 className="w-3 h-3 animate-spin text-amber-400" />
                                <span className="text-amber-400">Saving...</span>
                            </>
                        ) : saveStatus === "unsaved" ? (
                            <>
                                <AlertCircle className="w-3 h-3 text-amber-400" />
                                <span className="text-amber-400">Unsaved</span>
                            </>
                        ) : (
                            <>
                                <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                                <span className="text-emerald-400">Saved</span>
                            </>
                        )}
                    </div>
                    <div className="flex items-center gap-1.5">
                        <Wifi className="w-3 h-3 text-emerald-500" />
                        <span>Connected</span>
                    </div>
                    <span>TypeScript</span>
                    <span>UTF-8</span>
                    <span>Spaces: 2</span>
                </div>
            </div>
        </div>
    );
}
