import { useState, useRef, useEffect } from "react";
import {
    ChevronRight,
    ChevronDown,
    File,
    FolderOpen,
    Folder,
    Search,
    FileCode,
    FileJson,
    FileText,
    Image,
    Plus,
    MoreHorizontal,
    X,
    Trash2,
    Pencil,
    FolderPlus,
    ChevronUp,
    Globe,
    Loader2,
    Copy,
} from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { apiRequest } from "@/lib/queryClient";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface FileNode {
    name: string;
    type: "file" | "folder";
    children?: FileNode[];
    language?: string;
    path: string;
}

function inferLanguage(path: string): string | undefined {
    if (path.endsWith(".tsx")) return "tsx";
    if (path.endsWith(".ts")) return "ts";
    if (path.endsWith(".css")) return "css";
    if (path.endsWith(".json")) return "json";
    if (path.endsWith(".md")) return "md";
    if (path.endsWith(".html")) return "html";
    if (path.endsWith(".js") || path.endsWith(".jsx")) return "js";
    return undefined;
}

function sortTree(nodes: FileNode[]): FileNode[] {
    const sorted = [...nodes].sort((a, b) => {
        if (a.type !== b.type) return a.type === "folder" ? -1 : 1;
        return a.name.localeCompare(b.name);
    });
    return sorted.map((node) =>
        node.type === "folder" && node.children
            ? { ...node, children: sortTree(node.children) }
            : node
    );
}

function buildTreeFromPaths(paths: string[]): FileNode[] {
    const roots: FileNode[] = [];
    for (const fullPath of paths) {
        const segments = fullPath.split("/").filter(Boolean);
        let current = roots;
        let traversed = "";
        for (let i = 0; i < segments.length; i += 1) {
            const segment = segments[i];
            traversed = traversed ? `${traversed}/${segment}` : segment;
            const isLast = i === segments.length - 1;
            let existing = current.find((entry) => entry.name === segment);
            if (!existing) {
                existing = {
                    name: segment,
                    type: isLast ? "file" : "folder",
                    path: traversed,
                    language: isLast ? inferLanguage(fullPath) : undefined,
                    children: isLast ? undefined : [],
                };
                current.push(existing);
            }
            if (!isLast) {
                if (!existing.children) existing.children = [];
                current = existing.children;
            }
        }
    }
    return sortTree(roots);
}

function getFileIcon(name: string, language?: string) {
    if (language === "tsx" || language === "ts" || language === "js") return <FileCode className="w-4 h-4 text-blue-400" />;
    if (language === "json") return <FileJson className="w-4 h-4 text-yellow-400" />;
    if (language === "css") return <FileCode className="w-4 h-4 text-purple-400" />;
    if (language === "md") return <FileText className="w-4 h-4 text-muted-foreground" />;
    if (language === "html") return <FileCode className="w-4 h-4 text-orange-400" />;
    if (name.endsWith(".svg") || name.endsWith(".ico") || name.endsWith(".png")) return <Image className="w-4 h-4 text-green-400" />;
    return <File className="w-4 h-4 text-muted-foreground" />;
}

interface FileTreeItemProps {
    node: FileNode;
    depth: number;
    collapseSignal: number;
    activeFile: string | null;
    onFileClick: (name: string, path: string) => void;
    onDeleteFile?: (path: string) => void;
    onRenameFile?: (oldPath: string, newPath: string) => void;
    onDuplicateFile?: (path: string) => void;
}

function FileTreeItem({ node, depth, collapseSignal, activeFile, onFileClick, onDeleteFile, onRenameFile, onDuplicateFile }: FileTreeItemProps) {
    const [expanded, setExpanded] = useState(depth < 1);
    const [isRenaming, setIsRenaming] = useState(false);
    const [renameValue, setRenameValue] = useState(node.name);
    const fullPath = node.path;

    useEffect(() => {
        setExpanded(false);
    }, [collapseSignal]);

    const handleRenameSubmit = () => {
        const trimmed = renameValue.trim();
        if (trimmed && trimmed !== node.name && onRenameFile) {
            const parentPath = fullPath.includes("/") ? fullPath.substring(0, fullPath.lastIndexOf("/")) : "";
            const newPath = parentPath ? `${parentPath}/${trimmed}` : trimmed;
            onRenameFile(fullPath, newPath);
        }
        setIsRenaming(false);
    };

    const contextActions = (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <button
                    onClick={(e) => e.stopPropagation()}
                    className="hidden group-hover:flex p-0.5 rounded hover:bg-[hsl(240,5%,15%)] text-muted-foreground hover:text-foreground transition-colors"
                >
                    <MoreHorizontal className="w-3 h-3" />
                </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-40 bg-[hsl(240,10%,7%)] border-[hsl(240,5%,15%)] text-foreground">
                <DropdownMenuItem
                    className="focus:bg-[hsl(240,5%,15%)] focus:text-foreground cursor-pointer text-xs"
                    onClick={(e) => { e.stopPropagation(); setRenameValue(node.name); setIsRenaming(true); }}
                >
                    <Pencil className="mr-2 h-3 w-3" /> Rename
                </DropdownMenuItem>
                {node.type === "file" && onDuplicateFile && (
                    <DropdownMenuItem
                        className="focus:bg-[hsl(240,5%,15%)] focus:text-foreground cursor-pointer text-xs"
                        onClick={(e) => { e.stopPropagation(); onDuplicateFile(fullPath); }}
                    >
                        <Copy className="mr-2 h-3 w-3" /> Duplicate
                    </DropdownMenuItem>
                )}
                <DropdownMenuSeparator className="bg-[hsl(240,5%,15%)]" />
                <DropdownMenuItem
                    className="focus:bg-red-500/20 focus:text-red-400 cursor-pointer text-xs text-red-400"
                    onClick={(e) => { e.stopPropagation(); onDeleteFile?.(fullPath); }}
                >
                    <Trash2 className="mr-2 h-3 w-3" /> Delete
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    );

    if (node.type === "folder") {
        return (
            <div>
                <div
                    onClick={() => setExpanded(!expanded)}
                    className="w-full flex items-center gap-1.5 py-[5px] px-2 text-sm text-muted-foreground hover:text-foreground hover:bg-[hsl(25,30%,12%)] rounded-sm transition-colors group cursor-pointer"
                    style={{ paddingLeft: `${depth * 12 + 8}px` }}
                >
                    {expanded ? <ChevronDown className="w-3.5 h-3.5 shrink-0 text-muted-foreground/70" /> : <ChevronRight className="w-3.5 h-3.5 shrink-0 text-muted-foreground/70" />}
                    {expanded ? <FolderOpen className="w-4 h-4 shrink-0 text-primary/80" /> : <Folder className="w-4 h-4 shrink-0 text-primary/60" />}
                    {isRenaming ? (
                        <input type="text" value={renameValue} onChange={(e) => setRenameValue(e.target.value)}
                            onKeyDown={(e) => { if (e.key === "Enter") handleRenameSubmit(); if (e.key === "Escape") setIsRenaming(false); }}
                            onClick={(e) => e.stopPropagation()} autoFocus
                            className="flex-1 bg-[hsl(240,10%,7%)] border border-primary/50 rounded px-1 py-0 text-xs text-foreground outline-none" />
                    ) : (
                        <span className="truncate text-[13px] font-medium flex-1">{node.name}</span>
                    )}
                    {!isRenaming && contextActions}
                </div>
                {expanded && node.children && (
                    <div>
                        {node.children.map((child) => (
                            <FileTreeItem key={child.path} node={child} depth={depth + 1} collapseSignal={collapseSignal}
                                activeFile={activeFile} onFileClick={onFileClick}
                                onDeleteFile={onDeleteFile} onRenameFile={onRenameFile}
                                onDuplicateFile={onDuplicateFile} />
                        ))}
                    </div>
                )}
            </div>
        );
    }

    const isActive = activeFile === fullPath;

    return (
        <div
            onClick={() => !isRenaming && onFileClick(node.name, fullPath)}
            className={`cursor-pointer w-full flex items-center gap-1.5 py-[5px] px-2 text-[13px] rounded-sm transition-colors group ${isActive
                ? "bg-primary/15 text-foreground"
                : "text-muted-foreground hover:text-foreground hover:bg-[hsl(25,30%,12%)]"
                }`}
            style={{ paddingLeft: `${depth * 12 + 22}px` }}
        >
            {getFileIcon(node.name, node.language)}
            {isRenaming ? (
                <input type="text" value={renameValue} onChange={(e) => setRenameValue(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter") handleRenameSubmit(); if (e.key === "Escape") setIsRenaming(false); }}
                    onClick={(e) => e.stopPropagation()} autoFocus
                    className="flex-1 bg-[hsl(240,10%,7%)] border border-primary/50 rounded px-1 py-0 text-xs text-foreground outline-none" />
            ) : (
                <span className="truncate flex-1 text-left">{node.name}</span>
            )}
            {!isRenaming && contextActions}
        </div>
    );
}

interface FileExplorerProps {
    activeFile: string | null;
    onFileClick: (name: string, path: string) => void;
    files: Record<string, { content: string; language: string }>;
    onAddFile?: (fileName: string) => void;
    onAddFileWithContent?: (fileName: string, content: string) => void;
    onDuplicateFile?: (path: string) => void;
    onDeleteFile?: (path: string) => void;
    onRenameFile?: (oldPath: string, newPath: string) => void;
    onCloneResult?: (result: {
        url: string;
        title: string;
        source: string;
        analysis?: {
            proposition?: string;
            strengths?: string[];
            weaknesses?: string[];
            gaps?: string[];
            improvements?: string[];
        };
    }) => void;
}

export default function FileExplorer({ activeFile, onFileClick, files, onAddFile, onAddFileWithContent, onDuplicateFile, onDeleteFile, onRenameFile, onCloneResult }: FileExplorerProps) {
    const [searchQuery, setSearchQuery] = useState("");
    const [isCreating, setIsCreating] = useState(false);
    const [createMode, setCreateMode] = useState<"file" | "folder">("file");
    const [newFileName, setNewFileName] = useState("");
    const [cloneUrl, setCloneUrl] = useState("");
    const [isCloning, setIsCloning] = useState(false);
    const [cloneStatus, setCloneStatus] = useState<string | null>(null);
    const [collapseSignal, setCollapseSignal] = useState(0);

    const allPaths = Object.keys(files);
    const visiblePaths = searchQuery.trim().length === 0
        ? allPaths
        : allPaths.filter((path) => path.toLowerCase().includes(searchQuery.trim().toLowerCase()));
    const tree = buildTreeFromPaths(visiblePaths);

    const handleCreateFile = () => {
        const trimmed = newFileName.trim();
        if (trimmed && onAddFile) {
            if (createMode === "folder") {
                // Create a placeholder file inside the folder so it shows up
                onAddFile(`${trimmed}/.gitkeep`);
            } else {
                onAddFile(trimmed);
            }
            setNewFileName("");
            setIsCreating(false);
        }
    };

    const handleDuplicateFile = (path: string) => {
        if (!files[path]) return;
        onDuplicateFile?.(path);
    };

    const handleCloneWebsite = async () => {
        const url = cloneUrl.trim();
        if (!url) return;

        setIsCloning(true);
        setCloneStatus("Fetching...");

        try {
            const res = await apiRequest("POST", "/api/clone-website", { url });
            const data = await res.json();
            const fileName = `cloned-site/index.html`;

            if (onAddFileWithContent) {
                onAddFileWithContent(fileName, data.html);
            } else if (onAddFile) {
                onAddFile(fileName);
            }

            const source = data.source ? ` via ${data.source}` : "";
            setCloneStatus(`✓ Cloned ${data.title || "site"}${source}`);
            onCloneResult?.({
                url: data.url || url,
                title: data.title || "Cloned site",
                source: data.source || "direct",
                analysis: data.analysis,
            });
            setCloneUrl("");
            setTimeout(() => setCloneStatus(null), 4000);
        } catch (err: any) {
            setCloneStatus(`✗ ${err.message || "Network error"}`);
            setTimeout(() => setCloneStatus(null), 5000);
        } finally {
            setIsCloning(false);
        }
    };

    const fileCount = allPaths.length;
    const folderCount = new Set(allPaths.map((p) => p.split("/").slice(0, -1).join("/")).filter(Boolean)).size;

    return (
        <div className="h-full flex flex-col bg-[hsl(240,10%,4%)]">
            {/* Header */}
            <div className="px-3 py-2.5 border-b border-[hsl(240,5%,12%)] flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Explorer</span>
                <div className="flex items-center gap-1">
                    <button
                        onClick={() => { setCreateMode("file"); setIsCreating(true); }}
                        className="p-1 rounded hover:bg-[hsl(240,5%,12%)] text-muted-foreground hover:text-foreground transition-colors"
                        title="New File"
                    >
                        <Plus className="w-3.5 h-3.5" />
                    </button>
                    <button
                        onClick={() => { setCreateMode("folder"); setIsCreating(true); }}
                        className="p-1 rounded hover:bg-[hsl(240,5%,12%)] text-muted-foreground hover:text-foreground transition-colors"
                        title="New Folder"
                    >
                        <FolderPlus className="w-3.5 h-3.5" />
                    </button>
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <button className="p-1 rounded hover:bg-[hsl(240,5%,12%)] text-muted-foreground hover:text-foreground transition-colors">
                                <MoreHorizontal className="w-3.5 h-3.5" />
                            </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-44 bg-[hsl(240,10%,7%)] border-[hsl(240,5%,15%)] text-foreground">
                            <DropdownMenuItem className="focus:bg-[hsl(240,5%,15%)] focus:text-foreground cursor-pointer text-xs"
                                onClick={() => { setCreateMode("file"); setIsCreating(true); }}>
                                <Plus className="mr-2 h-3 w-3" /> New File
                            </DropdownMenuItem>
                            <DropdownMenuItem className="focus:bg-[hsl(240,5%,15%)] focus:text-foreground cursor-pointer text-xs"
                                onClick={() => { setCreateMode("folder"); setIsCreating(true); }}>
                                <FolderPlus className="mr-2 h-3 w-3" /> New Folder
                            </DropdownMenuItem>
                            <DropdownMenuSeparator className="bg-[hsl(240,5%,15%)]" />
                            <DropdownMenuItem className="focus:bg-[hsl(240,5%,15%)] focus:text-foreground cursor-pointer text-xs"
                                onClick={() => setCollapseSignal((prev) => prev + 1)}>
                                <ChevronUp className="mr-2 h-3 w-3" /> Collapse All
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>
            </div>

            {/* New File / Folder Input */}
            {isCreating && (
                <div className="px-2 py-2 border-b border-[hsl(240,5%,12%)]">
                    <div className="text-[10px] text-muted-foreground mb-1 font-medium uppercase tracking-wider">
                        New {createMode === "folder" ? "Folder" : "File"}
                    </div>
                    <div className="flex items-center gap-1.5">
                        <input
                            type="text"
                            value={newFileName}
                            onChange={(e) => setNewFileName(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === "Enter") handleCreateFile();
                                if (e.key === "Escape") { setIsCreating(false); setNewFileName(""); }
                            }}
                            autoFocus
                            placeholder={createMode === "folder" ? "e.g. components" : "e.g. components/Button.tsx"}
                            className="flex-1 bg-[hsl(240,10%,7%)] border border-primary/50 rounded text-xs px-2 py-1.5 text-foreground placeholder:text-muted-foreground/50 focus:outline-none transition-colors"
                        />
                        <button onClick={handleCreateFile} className="p-1 text-emerald-400 hover:text-emerald-300">
                            <Plus className="w-3.5 h-3.5" />
                        </button>
                        <button onClick={() => { setIsCreating(false); setNewFileName(""); }} className="p-1 text-muted-foreground hover:text-foreground">
                            <X className="w-3.5 h-3.5" />
                        </button>
                    </div>
                </div>
            )}

            {/* Search */}
            <div className="px-2 py-2">
                <div className="relative">
                    <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground/60" />
                    <input
                        type="text"
                        placeholder="Search files..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full bg-[hsl(240,10%,7%)] border border-[hsl(240,5%,14%)] rounded-md pl-7 pr-2 py-1.5 text-xs text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-primary/50 transition-colors"
                    />
                </div>
            </div>

            {/* File Tree */}
            <ScrollArea className="flex-1 px-1">
                <div className="py-1">
                    {tree.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-8 text-muted-foreground/40">
                            <File className="w-8 h-8 mb-2" />
                            <p className="text-xs">No files found</p>
                        </div>
                    ) : (
                        tree.map((node) => (
                            <FileTreeItem
                                key={node.path}
                                node={node}
                                depth={0}
                                collapseSignal={collapseSignal}
                                activeFile={activeFile}
                                onFileClick={onFileClick}
                                onDeleteFile={onDeleteFile}
                                onRenameFile={onRenameFile}
                                onDuplicateFile={handleDuplicateFile}
                            />
                        ))
                    )}
                </div>
            </ScrollArea>

            {/* File count */}
            <div className="px-3 py-1.5 border-t border-[hsl(240,5%,12%)] text-[10px] text-muted-foreground/50">
                {fileCount} files · {folderCount} folders
            </div>

            {/* URL Clone Section */}
            <div className="p-3 border-t border-[hsl(240,5%,12%)] bg-[hsl(240,10%,6%)]">
                <div className="text-xs font-semibold text-muted-foreground mb-2 flex items-center gap-1.5">
                    <Globe className="w-3.5 h-3.5" />
                    Clone Website
                </div>
                <div className="flex gap-2">
                    <input
                        type="url"
                        placeholder="Paste website URL..."
                        value={cloneUrl}
                        onChange={(e) => setCloneUrl(e.target.value)}
                        onKeyDown={(e) => { if (e.key === "Enter") handleCloneWebsite(); }}
                        className="flex-1 bg-[hsl(240,10%,4%)] border border-[hsl(240,5%,14%)] rounded text-xs px-2 py-1.5 text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-primary/50 transition-colors"
                    />
                    <button
                        onClick={handleCloneWebsite}
                        disabled={isCloning || !cloneUrl.trim()}
                        className="px-3 bg-primary text-primary-foreground text-xs font-medium rounded hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
                    >
                        {isCloning ? <Loader2 className="w-3 h-3 animate-spin" /> : null}
                        {isCloning ? "..." : "Clone"}
                    </button>
                </div>
                {cloneStatus && (
                    <p className="text-[10px] text-emerald-400 mt-1.5">{cloneStatus}</p>
                )}
            </div>
        </div>
    );
}
