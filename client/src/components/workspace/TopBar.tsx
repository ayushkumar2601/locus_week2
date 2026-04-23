import { useState } from "react";
import {
    Play, Eye, Settings, Share2, ChevronDown, PanelLeftClose, PanelLeft,
    LayoutDashboard, LogOut, Check, X, Loader2, Copy, Download, ExternalLink,
    Sun, Moon, Monitor, Terminal, Code2, FolderOpen, Brain, Camera
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLocation } from "wouter";
import { apiRequest, clearAuthToken } from "@/lib/queryClient";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
    DropdownMenuSub,
    DropdownMenuSubContent,
    DropdownMenuSubTrigger,
} from "@/components/ui/dropdown-menu";

interface TopBarProps {
    sidebarCollapsed: boolean;
    onToggleSidebar: () => void;
    projectName?: string;
    onRenameProject?: (name: string) => void;
    saveStatus?: "saved" | "saving" | "unsaved";
    username?: string;
    onRunProject?: () => void;
    onPreviewProject?: () => void;
    isPreviewOpen?: boolean;
    tokenEstimate?: number;
    learningMode?: boolean;
    onToggleLearningMode?: () => void;
    onUploadScreenshot?: () => void;
    chatwootConfig?: {
        chatwootUrl: string;
        websiteToken: string;
    } | null;
}

function escapeJsString(input: string): string {
    return input.replace(/\\/g, "\\\\").replace(/'/g, "\\'");
}

function buildChatwootSnippet(chatwootUrl: string, websiteToken: string): string {
    const url = escapeJsString(chatwootUrl.trim().replace(/\/+$/, ""));
    const token = escapeJsString(websiteToken.trim());
    return `<script>\n(function(d,t) {\n  var BASE_URL='${url}';\n  var g=d.createElement(t),s=d.getElementsByTagName(t)[0];\n  g.src=BASE_URL+'/packs/js/sdk.js';\n  g.defer=true; g.async=true;\n  s.parentNode.insertBefore(g,s);\n  g.onload=function(){\n    window.chatwootSDK.run({websiteToken:'${token}',baseUrl:BASE_URL})\n  }\n})(document,'script');\n</script>`;
}

function injectChatwootSnippetIfNeeded(content: string, filePath: string, chatwootConfig?: { chatwootUrl: string; websiteToken: string } | null): string {
    const normalized = filePath.toLowerCase();
    const isIndexHtml = normalized.endsWith("/index.html") || normalized === "index.html";
    if (!isIndexHtml || !chatwootConfig?.chatwootUrl || !chatwootConfig?.websiteToken) {
        return content;
    }

    if (/chatwootsdk\.run|\/packs\/js\/sdk\.js/i.test(content)) {
        return content;
    }

    const snippet = buildChatwootSnippet(chatwootConfig.chatwootUrl, chatwootConfig.websiteToken);
    if (/<\/body>/i.test(content)) {
        return content.replace(/<\/body>/i, `${snippet}\n</body>`);
    }
    return `${content}\n${snippet}`;
}

export default function TopBar({
    sidebarCollapsed,
    onToggleSidebar,
    projectName = "my-project",
    onRenameProject,
    saveStatus,
    username = "User",
    onRunProject,
    onPreviewProject,
    isPreviewOpen = false,
    tokenEstimate = 0,
    learningMode = false,
    onToggleLearningMode,
    onUploadScreenshot,
    chatwootConfig,
}: TopBarProps) {
    const [, navigate] = useLocation();
    const [isEditing, setIsEditing] = useState(false);
    const [editValue, setEditValue] = useState(projectName);
    const [shareToast, setShareToast] = useState(false);
    const [downloadingFiles, setDownloadingFiles] = useState(false);

    const userInitial = username.charAt(0).toUpperCase();

    const handleLogout = async () => {
        try {
            await apiRequest("POST", "/api/auth/signout");
        } catch {
            // Clear local auth state even if server signout fails.
        } finally {
            clearAuthToken();
            navigate("/auth");
        }
    };

    const startEditing = () => {
        setEditValue(projectName);
        setIsEditing(true);
    };

    const confirmRename = () => {
        const trimmed = editValue.trim();
        if (trimmed && trimmed !== projectName && onRenameProject) {
            onRenameProject(trimmed);
        }
        setIsEditing(false);
    };

    const cancelEditing = () => {
        setEditValue(projectName);
        setIsEditing(false);
    };

    const handleShare = () => {
        const url = window.location.href;
        navigator.clipboard.writeText(url).then(() => {
            setShareToast(true);
            setTimeout(() => setShareToast(false), 2000);
        });
    };

    const handleOpenInNewTab = () => {
        window.open(window.location.href, "_blank");
    };

    const handleDownloadProject = async () => {
        setDownloadingFiles(true);
        try {
            const projectId = new URLSearchParams(window.location.search).get("project");
            if (!projectId) return;

            const res = await apiRequest("GET", `/api/projects/${projectId}`);
            const project = await res.json();

            // Create a text representation of all files 
            let content = `# ${project.name}\n# Exported from Synapse Builder\n\n`;
            for (const [path, file] of Object.entries(project.files)) {
                const f = file as { content: string; language: string };
                const exportedContent = injectChatwootSnippetIfNeeded(f.content, path, chatwootConfig);
                content += `${"=".repeat(60)}\n`;
                content += `# File: ${path}\n`;
                content += `${"=".repeat(60)}\n\n`;
                content += exportedContent;
                content += "\n\n";
            }

            const blob = new Blob([content], { type: "text/plain" });
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = `${project.name.replace(/\s+/g, "-").toLowerCase()}-export.txt`;
            a.click();
            URL.revokeObjectURL(url);
        } catch (error) {
            console.error("Failed to download project:", error);
        } finally {
            setDownloadingFiles(false);
        }
    };

    return (
        <div className="h-12 bg-[hsl(240,10%,5%)] border-b border-[hsl(240,5%,12%)] flex items-center justify-between px-3 select-none shrink-0">
            {/* Left: Logo + Project */}
            <div className="flex items-center gap-3">
                <button
                    onClick={onToggleSidebar}
                    className="p-1.5 rounded-md hover:bg-[hsl(240,5%,12%)] text-muted-foreground hover:text-foreground transition-colors"
                    title={sidebarCollapsed ? "Show sidebar" : "Hide sidebar"}
                >
                    {sidebarCollapsed ? <PanelLeft className="w-4 h-4" /> : <PanelLeftClose className="w-4 h-4" />}
                </button>

                <div
                    className="flex items-center gap-2 cursor-pointer hover:opacity-80 transition-opacity"
                    onClick={() => navigate("/")}
                    title="Go to home"
                >
                    <img src="/logo.png" alt="Synapse" className="w-6 h-6 rounded-md object-cover" />
                    <span className="font-display font-semibold text-sm">Synapse</span>
                </div>

                <div className="h-4 w-px bg-[hsl(240,5%,15%)]" />

                {isEditing ? (
                    <div className="flex items-center gap-1.5">
                        <input
                            type="text"
                            value={editValue}
                            onChange={(e) => setEditValue(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === "Enter") confirmRename();
                                if (e.key === "Escape") cancelEditing();
                            }}
                            autoFocus
                            className="bg-[hsl(240,10%,8%)] border border-primary/50 rounded px-2 py-0.5 text-sm font-medium text-foreground outline-none w-40"
                        />
                        <button onClick={confirmRename} className="p-1 rounded hover:bg-[hsl(240,5%,15%)] text-emerald-400">
                            <Check className="w-3.5 h-3.5" />
                        </button>
                        <button onClick={cancelEditing} className="p-1 rounded hover:bg-[hsl(240,5%,15%)] text-muted-foreground">
                            <X className="w-3.5 h-3.5" />
                        </button>
                    </div>
                ) : (
                    <button
                        onClick={startEditing}
                        className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
                        title="Click to rename project"
                    >
                        <span className="font-medium max-w-[200px] truncate">{projectName}</span>
                        <ChevronDown className="w-3 h-3" />
                    </button>
                )}

                {saveStatus && (
                    <div className="flex items-center gap-1 ml-1">
                        {saveStatus === "saving" && <Loader2 className="w-3 h-3 animate-spin text-amber-400" />}
                        {saveStatus === "saved" && <Check className="w-3 h-3 text-emerald-500" />}
                    </div>
                )}
            </div>

            {/* Center: Actions */}
            <div className="flex items-center gap-2">
                <div className="hidden lg:flex items-center gap-1 rounded-md border border-[hsl(240,5%,15%)] bg-[hsl(240,10%,7%)] px-2 py-1 text-[10px] text-muted-foreground">
                    <Code2 className="w-3 h-3" />
                    <span>~{tokenEstimate} tokens</span>
                </div>
                <button
                    type="button"
                    onClick={onToggleLearningMode}
                    className={`h-7 px-2.5 rounded-md border text-[10px] transition-colors flex items-center gap-1.5 ${learningMode
                        ? "border-primary/40 bg-primary/15 text-primary"
                        : "border-[hsl(240,5%,15%)] bg-[hsl(240,10%,7%)] text-muted-foreground hover:text-foreground"
                        }`}
                    title="Toggle learning mode"
                >
                    <Brain className="w-3 h-3" />
                    <span>Learning</span>
                    {learningMode && <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />}
                </button>
                <Button
                    size="sm"
                    className="h-7 px-3 text-xs bg-primary/20 text-primary hover:bg-primary/30 border border-primary/30"
                    onClick={onRunProject}
                    title="Run project preview"
                >
                    <Play className="w-3 h-3 mr-1.5 fill-current" />
                    Run
                </Button>
                <Button
                    size="sm"
                    variant="ghost"
                    className={`h-7 px-3 text-xs ${isPreviewOpen
                        ? "text-primary bg-primary/10"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                    onClick={onPreviewProject}
                    title="Toggle project preview panel"
                >
                    <Eye className="w-3 h-3 mr-1.5" />
                    Preview
                </Button>
                <Button
                    size="sm"
                    variant="ghost"
                    className="h-7 px-3 text-xs text-muted-foreground hover:text-foreground"
                    onClick={onUploadScreenshot}
                    title="Upload screenshot"
                >
                    <Camera className="w-3 h-3 mr-1.5" />
                    Upload Screenshot
                </Button>
            </div>

            {/* Right: Share + Settings + User */}
            <div className="flex items-center gap-2">
                {/* Share Button */}
                <div className="relative">
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <button
                                className="p-1.5 rounded-md hover:bg-[hsl(240,5%,12%)] text-muted-foreground hover:text-foreground transition-colors"
                                title="Share project"
                            >
                                <Share2 className="w-4 h-4" />
                            </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-52 bg-[hsl(240,10%,7%)] border-[hsl(240,5%,15%)] text-foreground">
                            <DropdownMenuLabel className="text-xs text-muted-foreground">Share Project</DropdownMenuLabel>
                            <DropdownMenuItem
                                className="focus:bg-[hsl(240,5%,15%)] focus:text-foreground cursor-pointer text-xs"
                                onClick={handleShare}
                            >
                                <Copy className="mr-2 h-3.5 w-3.5" />
                                Copy Link
                                {shareToast && <span className="ml-auto text-emerald-400 text-[10px]">Copied!</span>}
                            </DropdownMenuItem>
                            <DropdownMenuItem
                                className="focus:bg-[hsl(240,5%,15%)] focus:text-foreground cursor-pointer text-xs"
                                onClick={handleOpenInNewTab}
                            >
                                <ExternalLink className="mr-2 h-3.5 w-3.5" />
                                Open in New Tab
                            </DropdownMenuItem>
                            <DropdownMenuSeparator className="bg-[hsl(240,5%,15%)]" />
                            <DropdownMenuItem
                                className="focus:bg-[hsl(240,5%,15%)] focus:text-foreground cursor-pointer text-xs"
                                onClick={handleDownloadProject}
                                disabled={downloadingFiles}
                            >
                                <Download className="mr-2 h-3.5 w-3.5" />
                                {downloadingFiles ? "Exporting..." : "Export Project Files"}
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>

                {/* Settings Button */}
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <button
                            className="p-1.5 rounded-md hover:bg-[hsl(240,5%,12%)] text-muted-foreground hover:text-foreground transition-colors"
                            title="Settings"
                        >
                            <Settings className="w-4 h-4" />
                        </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-56 bg-[hsl(240,10%,7%)] border-[hsl(240,5%,15%)] text-foreground">
                        <DropdownMenuLabel className="text-xs text-muted-foreground">Workspace Settings</DropdownMenuLabel>
                        <DropdownMenuSeparator className="bg-[hsl(240,5%,15%)]" />
                        <DropdownMenuItem
                            className="focus:bg-[hsl(240,5%,15%)] focus:text-foreground cursor-pointer text-xs"
                            onClick={() => navigate("/dashboard")}
                        >
                            <LayoutDashboard className="mr-2 h-3.5 w-3.5" />
                            Open Dashboard
                        </DropdownMenuItem>
                        <DropdownMenuItem
                            className="focus:bg-[hsl(240,5%,15%)] focus:text-foreground cursor-pointer text-xs"
                            onClick={() => {
                                window.dispatchEvent(new CustomEvent("synapse:quick-open-file"));
                            }}
                        >
                            <FolderOpen className="mr-2 h-3.5 w-3.5" />
                            Quick Open File (Ctrl+P)
                        </DropdownMenuItem>
                        <DropdownMenuItem
                            className="focus:bg-[hsl(240,5%,15%)] focus:text-foreground cursor-pointer text-xs"
                            onClick={() => {
                                window.dispatchEvent(new CustomEvent("synapse:focus-terminal"));
                            }}
                        >
                            <Terminal className="mr-2 h-3.5 w-3.5" />
                            Focus Terminal
                        </DropdownMenuItem>
                        <DropdownMenuSeparator className="bg-[hsl(240,5%,15%)]" />
                        <DropdownMenuItem
                            className="focus:bg-[hsl(240,5%,15%)] focus:text-foreground cursor-pointer text-xs"
                            onClick={() => {
                                const root = document.documentElement;
                                const isLight = root.classList.contains("light");
                                if (isLight) {
                                    root.classList.remove("light");
                                    root.classList.add("dark");
                                } else {
                                    root.classList.remove("dark");
                                    root.classList.add("light");
                                }
                            }}
                        >
                            <Sun className="mr-2 h-3.5 w-3.5" />
                            Toggle Light/Dark Mode
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>

                {/* User Menu */}
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <button
                            className="w-7 h-7 rounded-full bg-linear-to-br from-primary to-amber-500 flex items-center justify-center text-[10px] font-bold text-white ml-1 hover:opacity-90 outline-none"
                            title={username}
                        >
                            {userInitial}
                        </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-56 bg-[hsl(240,10%,7%)] border-[hsl(240,5%,15%)] text-foreground">
                        <DropdownMenuLabel className="font-normal">
                            <div className="flex flex-col space-y-1">
                                <p className="text-sm font-medium leading-none">{username}</p>
                                <p className="text-xs leading-none text-muted-foreground">
                                    {username}@synapse.local
                                </p>
                            </div>
                        </DropdownMenuLabel>
                        <DropdownMenuSeparator className="bg-[hsl(240,5%,15%)]" />
                        <DropdownMenuItem className="focus:bg-[hsl(240,5%,15%)] focus:text-foreground cursor-pointer" onClick={() => navigate("/dashboard")}>
                            <LayoutDashboard className="mr-2 h-4 w-4" />
                            <span>Dashboard</span>
                        </DropdownMenuItem>
                        <DropdownMenuSeparator className="bg-[hsl(240,5%,15%)]" />
                        <DropdownMenuItem className="focus:bg-red-500/20 focus:text-red-500 cursor-pointer" onClick={handleLogout}>
                            <LogOut className="mr-2 h-4 w-4" />
                            <span>Log out</span>
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>
        </div>
    );
}
