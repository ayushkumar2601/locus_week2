import { useState, useRef, useCallback, useEffect, useMemo } from "react";
import { useLocation } from "wouter";
import {
    MousePointer2, Hand, Square, Circle, Type, Pen, Image, Minus,
    ArrowUpRight, ZoomIn, ZoomOut, Undo2, Redo2, Layers, ChevronDown,
    ChevronRight, Lock, Unlock, Eye, EyeOff, Trash2, Copy,
    AlignLeft, AlignCenter, AlignRight, AlignStartVertical,
    AlignCenterVertical, AlignEndVertical, Grid3X3, Download, Share2,
    Play, Plus, Search, MoreHorizontal, Bold, Italic, Underline, Move, Code2,
} from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";

// ─── Types ────────────────────────────────────────────────
type Tool = "select" | "hand" | "rectangle" | "ellipse" | "text" | "pen" | "line" | "arrow" | "image";

interface CanvasElement {
    id: string;
    type: "rectangle" | "ellipse" | "text" | "image" | "frame" | "line";
    name: string;
    x: number;
    y: number;
    width: number;
    height: number;
    fill: string;
    stroke: string;
    strokeWidth: number;
    opacity: number;
    rotation: number;
    borderRadius: number;
    locked: boolean;
    visible: boolean;
    children?: string[];
    text?: string;
    fontSize?: number;
    fontWeight?: string;
}

// ─── Mock Data ────────────────────────────────────────────
const initialElements: CanvasElement[] = [
    {
        id: "frame-1", type: "frame", name: "Hero Section",
        x: 120, y: 60, width: 800, height: 500,
        fill: "#0f172a", stroke: "#334155", strokeWidth: 1,
        opacity: 1, rotation: 0, borderRadius: 12,
        locked: false, visible: true,
        children: ["rect-1", "text-1", "text-2", "btn-1", "ellipse-1"],
    },
    {
        id: "rect-1", type: "rectangle", name: "Background Gradient",
        x: 120, y: 60, width: 800, height: 500,
        fill: "linear-gradient(135deg, #1e1b4b 0%, #0f172a 50%, #1a0e2e 100%)",
        stroke: "transparent", strokeWidth: 0, opacity: 1, rotation: 0,
        borderRadius: 12, locked: false, visible: true,
    },
    {
        id: "text-1", type: "text", name: "Heading",
        x: 220, y: 160, width: 600, height: 80,
        fill: "#ffffff", stroke: "transparent", strokeWidth: 0,
        opacity: 1, rotation: 0, borderRadius: 0,
        locked: false, visible: true,
        text: "Build Faster.\nShip Smarter.", fontSize: 48, fontWeight: "700",
    },
    {
        id: "text-2", type: "text", name: "Subtitle",
        x: 270, y: 290, width: 500, height: 50,
        fill: "#94a3b8", stroke: "transparent", strokeWidth: 0,
        opacity: 1, rotation: 0, borderRadius: 0,
        locked: false, visible: true,
        text: "The next-generation AI-powered platform\nfor modern web development.",
        fontSize: 16, fontWeight: "400",
    },
    {
        id: "btn-1", type: "rectangle", name: "CTA Button",
        x: 400, y: 380, width: 240, height: 52,
        fill: "#e97320", stroke: "transparent", strokeWidth: 0,
        opacity: 1, rotation: 0, borderRadius: 12,
        locked: false, visible: true,
    },
    {
        id: "ellipse-1", type: "ellipse", name: "Glow Effect",
        x: 350, y: 100, width: 350, height: 350,
        fill: "#e97320", stroke: "transparent", strokeWidth: 0,
        opacity: 0.08, rotation: 0, borderRadius: 0,
        locked: false, visible: true,
    },
];

let _nextId = 100;
function nextId() { return `el-${_nextId++}`; }

// ─── Toolbar ──────────────────────────────────────────────
function Toolbar({ activeTool, setActiveTool }: { activeTool: Tool; setActiveTool: (t: Tool) => void }) {
    const tools: { id: Tool; icon: any; label: string }[] = [
        { id: "select", icon: MousePointer2, label: "Select (V)" },
        { id: "hand", icon: Hand, label: "Hand (H)" },
        { id: "rectangle", icon: Square, label: "Rectangle (R)" },
        { id: "ellipse", icon: Circle, label: "Ellipse (O)" },
        { id: "line", icon: Minus, label: "Line (L)" },
        { id: "arrow", icon: ArrowUpRight, label: "Arrow" },
        { id: "pen", icon: Pen, label: "Pen (P)" },
        { id: "text", icon: Type, label: "Text (T)" },
        { id: "image", icon: Image, label: "Image" },
    ];

    return (
        <div className="flex items-center gap-0.5 bg-[hsl(240,10%,7%)] border border-[hsl(240,5%,14%)] rounded-xl px-1.5 py-1 shadow-lg">
            {tools.map((tool) => (
                <button
                    key={tool.id}
                    onClick={() => setActiveTool(tool.id)}
                    title={tool.label}
                    className={`p-2 rounded-lg transition-all ${activeTool === tool.id
                        ? "bg-primary/20 text-primary shadow-sm"
                        : "text-muted-foreground hover:text-foreground hover:bg-[hsl(240,5%,12%)]"
                        }`}
                >
                    <tool.icon className="w-4 h-4" />
                </button>
            ))}
        </div>
    );
}

// ─── Layers Panel ─────────────────────────────────────────
function LayersPanel({
    elements, selectedId, onSelect, onToggleVisibility, onToggleLock, onAddElement,
}: {
    elements: CanvasElement[];
    selectedId: string | null;
    onSelect: (id: string) => void;
    onToggleVisibility: (id: string) => void;
    onToggleLock: (id: string) => void;
    onAddElement: () => void;
}) {
    const [expandedFrames, setExpandedFrames] = useState<Set<string>>(new Set(["frame-1"]));
    const [searchQuery, setSearchQuery] = useState("");
    const [showSearch, setShowSearch] = useState(false);

    const toggleExpand = (id: string) => {
        setExpandedFrames((prev) => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id); else next.add(id);
            return next;
        });
    };

    const getIcon = (type: string) => {
        switch (type) {
            case "frame": return <Grid3X3 className="w-3 h-3" />;
            case "rectangle": return <Square className="w-3 h-3" />;
            case "ellipse": return <Circle className="w-3 h-3" />;
            case "text": return <Type className="w-3 h-3" />;
            case "image": return <Image className="w-3 h-3" />;
            default: return <Minus className="w-3 h-3" />;
        }
    };

    const filteredElements = searchQuery
        ? elements.filter((el) => el.name.toLowerCase().includes(searchQuery.toLowerCase()))
        : elements;

    const renderElement = (el: CanvasElement, depth: number = 0) => {
        const isFrame = el.type === "frame";
        const isExpanded = expandedFrames.has(el.id);
        const isSelected = selectedId === el.id;
        const children = isFrame ? elements.filter((e) => el.children?.includes(e.id)) : [];

        return (
            <div key={el.id}>
                <div
                    onClick={() => onSelect(el.id)}
                    className={`flex items-center gap-1.5 py-[5px] px-2 text-[12px] cursor-pointer group transition-colors ${isSelected
                        ? "bg-primary/15 text-foreground"
                        : "text-muted-foreground hover:bg-[hsl(25,30%,12%)] hover:text-foreground"
                        }`}
                    style={{ paddingLeft: `${depth * 16 + 8}px` }}
                >
                    {isFrame && (
                        <button onClick={(e) => { e.stopPropagation(); toggleExpand(el.id); }} className="p-0.5">
                            {isExpanded ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
                        </button>
                    )}
                    {!isFrame && <span className="w-4" />}
                    <span className={`${isSelected ? "text-primary" : "text-muted-foreground/60"}`}>{getIcon(el.type)}</span>
                    <span className="truncate flex-1">{el.name}</span>
                    <div className="hidden group-hover:flex items-center gap-0.5">
                        <button onClick={(e) => { e.stopPropagation(); onToggleVisibility(el.id); }} className="p-0.5 hover:text-foreground">
                            {el.visible ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
                        </button>
                        <button onClick={(e) => { e.stopPropagation(); onToggleLock(el.id); }} className="p-0.5 hover:text-foreground">
                            {el.locked ? <Lock className="w-3 h-3" /> : <Unlock className="w-3 h-3" />}
                        </button>
                    </div>
                </div>
                {isFrame && isExpanded && children.map((c) => renderElement(c, depth + 1))}
            </div>
        );
    };

    const topLevel = searchQuery
        ? filteredElements
        : elements.filter((el) => !elements.some((parent) => parent.children?.includes(el.id)));

    return (
        <div className="h-full flex flex-col bg-[hsl(240,10%,4%)]">
            <div className="px-3 py-2.5 border-b border-[hsl(240,5%,12%)] flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                    <Layers className="w-3.5 h-3.5 text-muted-foreground" />
                    <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Layers</span>
                </div>
                <div className="flex items-center gap-1">
                    <button onClick={() => setShowSearch(!showSearch)} className="p-1 rounded hover:bg-[hsl(240,5%,12%)] text-muted-foreground hover:text-foreground transition-colors">
                        <Search className="w-3.5 h-3.5" />
                    </button>
                    <button onClick={onAddElement} className="p-1 rounded hover:bg-[hsl(240,5%,12%)] text-muted-foreground hover:text-foreground transition-colors">
                        <Plus className="w-3.5 h-3.5" />
                    </button>
                </div>
            </div>
            {showSearch && (
                <div className="px-2 py-1.5 border-b border-[hsl(240,5%,12%)]">
                    <input
                        type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Search layers..."
                        className="w-full bg-[hsl(240,10%,7%)] border border-[hsl(240,5%,14%)] rounded px-2 py-1 text-[11px] text-foreground outline-none focus:border-primary/50"
                        autoFocus
                    />
                </div>
            )}
            <ScrollArea className="flex-1">
                <div className="py-1">{topLevel.map((el) => renderElement(el))}</div>
            </ScrollArea>
        </div>
    );
}

// ─── Properties Panel ─────────────────────────────────────
function PropertiesPanel({
    element, onUpdate, onDuplicate, onDelete,
}: {
    element: CanvasElement | null;
    onUpdate: (id: string, updates: Partial<CanvasElement>) => void;
    onDuplicate: (id: string) => void;
    onDelete: (id: string) => void;
}) {
    if (!element) {
        return (
            <div className="h-full flex flex-col items-center justify-center bg-[hsl(240,10%,4%)] text-muted-foreground/40 px-6 text-center">
                <MousePointer2 className="w-10 h-10 mb-3 opacity-30" />
                <p className="text-sm font-medium">No selection</p>
                <p className="text-xs mt-1">Click an element on the canvas or layer to inspect</p>
            </div>
        );
    }

    const numInput = (label: string, value: number, onChange: (v: number) => void) => (
        <div className="flex items-center gap-1.5">
            <span className="text-[10px] text-muted-foreground/50 w-3 font-medium">{label}</span>
            <input type="number" value={Math.round(value)}
                onChange={(e) => onChange(Number(e.target.value))}
                className="w-full bg-[hsl(240,10%,7%)] border border-[hsl(240,5%,14%)] rounded-md px-2 py-1 text-[11px] text-foreground focus:outline-none focus:border-primary/50"
            />
        </div>
    );

    return (
        <div className="h-full flex flex-col bg-[hsl(240,10%,4%)]">
            <div className="px-3 py-2.5 border-b border-[hsl(240,5%,12%)] flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Design</span>
                <button className="p-1 rounded hover:bg-[hsl(240,5%,12%)] text-muted-foreground hover:text-foreground transition-colors">
                    <MoreHorizontal className="w-3.5 h-3.5" />
                </button>
            </div>
            <ScrollArea className="flex-1">
                <div className="p-3 space-y-4">
                    {/* Alignment */}
                    <div>
                        <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/60 block mb-2">Alignment</span>
                        <div className="flex items-center gap-1">
                            {[AlignLeft, AlignCenterVertical, AlignRight, AlignStartVertical, AlignCenter, AlignEndVertical].map((Icon, i) => (
                                <button key={i} className="p-1.5 rounded hover:bg-[hsl(240,5%,12%)] text-muted-foreground hover:text-foreground transition-colors">
                                    <Icon className="w-3.5 h-3.5" />
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Position & Size */}
                    <div>
                        <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/60 block mb-2">Position & Size</span>
                        <div className="grid grid-cols-2 gap-2">
                            {numInput("X", element.x, (v) => onUpdate(element.id, { x: v }))}
                            {numInput("Y", element.y, (v) => onUpdate(element.id, { y: v }))}
                            {numInput("W", element.width, (v) => onUpdate(element.id, { width: Math.max(1, v) }))}
                            {numInput("H", element.height, (v) => onUpdate(element.id, { height: Math.max(1, v) }))}
                        </div>
                    </div>

                    {/* Rotation & Radius */}
                    <div>
                        <div className="grid grid-cols-2 gap-2">
                            {numInput("↻", element.rotation, (v) => onUpdate(element.id, { rotation: v }))}
                            {numInput("⌒", element.borderRadius, (v) => onUpdate(element.id, { borderRadius: Math.max(0, v) }))}
                        </div>
                    </div>

                    {/* Fill */}
                    <div>
                        <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/60 block mb-2">Fill</span>
                        <div className="flex items-center gap-2">
                            <input type="color" value={element.fill.startsWith("linear") ? "#e97320" : element.fill}
                                onChange={(e) => onUpdate(element.id, { fill: e.target.value })}
                                className="w-7 h-7 rounded-md border border-[hsl(240,5%,14%)] cursor-pointer bg-transparent"
                            />
                            <input type="text"
                                value={element.fill.startsWith("linear") ? "Gradient" : element.fill}
                                onChange={(e) => onUpdate(element.id, { fill: e.target.value })}
                                className="flex-1 bg-[hsl(240,10%,7%)] border border-[hsl(240,5%,14%)] rounded-md px-2 py-1 text-[11px] text-foreground font-mono focus:outline-none focus:border-primary/50"
                            />
                            <input type="number" value={Math.round(element.opacity * 100)} min={0} max={100}
                                onChange={(e) => onUpdate(element.id, { opacity: Number(e.target.value) / 100 })}
                                className="w-14 bg-[hsl(240,10%,7%)] border border-[hsl(240,5%,14%)] rounded-md px-2 py-1 text-[11px] text-foreground focus:outline-none focus:border-primary/50"
                            />
                        </div>
                    </div>

                    {/* Stroke */}
                    <div>
                        <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/60 block mb-2">Stroke</span>
                        <div className="flex items-center gap-2">
                            <input type="color" value={element.stroke === "transparent" ? "#000000" : element.stroke}
                                onChange={(e) => onUpdate(element.id, { stroke: e.target.value })}
                                className="w-7 h-7 rounded-md border border-[hsl(240,5%,14%)] cursor-pointer bg-transparent"
                            />
                            <input type="text" value={element.stroke}
                                onChange={(e) => onUpdate(element.id, { stroke: e.target.value })}
                                className="flex-1 bg-[hsl(240,10%,7%)] border border-[hsl(240,5%,14%)] rounded-md px-2 py-1 text-[11px] text-foreground font-mono focus:outline-none focus:border-primary/50"
                            />
                            <input type="number" value={element.strokeWidth} min={0}
                                onChange={(e) => onUpdate(element.id, { strokeWidth: Number(e.target.value) })}
                                className="w-14 bg-[hsl(240,10%,7%)] border border-[hsl(240,5%,14%)] rounded-md px-2 py-1 text-[11px] text-foreground focus:outline-none focus:border-primary/50"
                            />
                        </div>
                    </div>

                    {/* Text Properties */}
                    {element.type === "text" && (
                        <div>
                            <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/60 block mb-2">Typography</span>
                            <div className="space-y-2">
                                <textarea value={element.text || ""}
                                    onChange={(e) => onUpdate(element.id, { text: e.target.value })}
                                    rows={2}
                                    className="w-full bg-[hsl(240,10%,7%)] border border-[hsl(240,5%,14%)] rounded-md px-2 py-1 text-[11px] text-foreground focus:outline-none focus:border-primary/50 resize-none"
                                />
                                <div className="flex items-center gap-2">
                                    <input type="number" value={element.fontSize || 16} min={8} max={200}
                                        onChange={(e) => onUpdate(element.id, { fontSize: Number(e.target.value) })}
                                        className="w-16 bg-[hsl(240,10%,7%)] border border-[hsl(240,5%,14%)] rounded-md px-2 py-1 text-[11px] text-foreground focus:outline-none focus:border-primary/50"
                                    />
                                    <div className="flex items-center gap-0.5 border border-[hsl(240,5%,14%)] rounded-md p-0.5">
                                        <button onClick={() => onUpdate(element.id, { fontWeight: element.fontWeight === "700" ? "400" : "700" })}
                                            className={`p-1 rounded ${element.fontWeight === "700" ? "bg-primary/20 text-primary" : "text-muted-foreground hover:text-foreground"}`}>
                                            <Bold className="w-3 h-3" />
                                        </button>
                                        <button className="p-1 rounded hover:bg-[hsl(240,5%,12%)] text-muted-foreground hover:text-foreground">
                                            <Italic className="w-3 h-3" />
                                        </button>
                                        <button className="p-1 rounded hover:bg-[hsl(240,5%,12%)] text-muted-foreground hover:text-foreground">
                                            <Underline className="w-3 h-3" />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Actions */}
                    <div className="pt-2 border-t border-[hsl(240,5%,12%)]">
                        <div className="flex items-center gap-1">
                            <button onClick={() => onDuplicate(element.id)}
                                className="flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-md text-[11px] text-muted-foreground hover:text-foreground hover:bg-[hsl(240,5%,12%)] transition-colors">
                                <Copy className="w-3 h-3" /> Duplicate
                            </button>
                            <button onClick={() => onDelete(element.id)}
                                className="flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-md text-[11px] text-red-400 hover:text-red-300 hover:bg-red-500/10 transition-colors">
                                <Trash2 className="w-3 h-3" /> Delete
                            </button>
                        </div>
                    </div>
                </div>
            </ScrollArea>
        </div>
    );
}

// ─── Canvas ───────────────────────────────────────────────
type InteractionMode = "none" | "drawing" | "moving" | "resizing" | "panning";

function Canvas({
    elements, selectedId, onSelect, activeTool,
    onMoveElement, onAddElement, onResizeElement,
    panOffset, setPanOffset, zoom, setZoom,
}: {
    elements: CanvasElement[];
    selectedId: string | null;
    onSelect: (id: string | null) => void;
    activeTool: Tool;
    onMoveElement: (id: string, dx: number, dy: number) => void;
    onAddElement: (el: CanvasElement) => void;
    onResizeElement: (id: string, w: number, h: number, x: number, y: number) => void;
    panOffset: { x: number; y: number };
    setPanOffset: (p: { x: number; y: number }) => void;
    zoom: number;
    setZoom: (z: number) => void;
}) {
    const canvasRef = useRef<HTMLDivElement>(null);
    const [mode, setMode] = useState<InteractionMode>("none");
    const startPosRef = useRef({ x: 0, y: 0 });
    const startElRef = useRef({ x: 0, y: 0, w: 0, h: 0 });
    const dragIdRef = useRef<string | null>(null);
    const drawingElRef = useRef<CanvasElement | null>(null);
    const [drawingEl, setDrawingEl] = useState<CanvasElement | null>(null);
    const resizeHandleRef = useRef<string>("");
    const panStartRef = useRef({ x: 0, y: 0 });

    const canvasToLocal = (clientX: number, clientY: number) => {
        const rect = canvasRef.current?.getBoundingClientRect();
        if (!rect) return { x: 0, y: 0 };
        return {
            x: (clientX - rect.left) / (zoom / 100) - panOffset.x,
            y: (clientY - rect.top) / (zoom / 100) - panOffset.y,
        };
    };

    const handleMouseDown = (e: React.MouseEvent) => {
        if (e.button !== 0) return;
        const pos = canvasToLocal(e.clientX, e.clientY);

        if (activeTool === "hand") {
            setMode("panning");
            panStartRef.current = { x: e.clientX - panOffset.x * (zoom / 100), y: e.clientY - panOffset.y * (zoom / 100) };
            return;
        }

        if (activeTool === "rectangle" || activeTool === "ellipse" || activeTool === "text") {
            const type = activeTool === "rectangle" ? "rectangle" : activeTool === "ellipse" ? "ellipse" : "text";
            const newEl: CanvasElement = {
                id: nextId(), type, name: `New ${type}`,
                x: pos.x, y: pos.y, width: 0, height: 0,
                fill: type === "text" ? "#ffffff" : "#6390ff",
                stroke: "transparent", strokeWidth: 0, opacity: 1,
                rotation: 0, borderRadius: type === "rectangle" ? 8 : 0,
                locked: false, visible: true,
                ...(type === "text" ? { text: "Text", fontSize: 24, fontWeight: "400" } : {}),
            };
            drawingElRef.current = newEl;
            setDrawingEl(newEl);
            startPosRef.current = pos;
            setMode("drawing");
            return;
        }

        // select tool — don't start drag from canvas background
        if (activeTool === "select" && e.target === canvasRef.current) {
            onSelect(null);
        }
    };

    const handleElementMouseDown = (e: React.MouseEvent, id: string) => {
        e.stopPropagation();
        if (activeTool !== "select") return;
        const el = elements.find((el) => el.id === id);
        if (!el || el.locked) return;
        onSelect(id);
        setMode("moving");
        dragIdRef.current = id;
        const pos = canvasToLocal(e.clientX, e.clientY);
        startPosRef.current = pos;
        startElRef.current = { x: el.x, y: el.y, w: el.width, h: el.height };
    };

    const handleResizeMouseDown = (e: React.MouseEvent, handle: string) => {
        e.stopPropagation();
        if (!selectedId) return;
        const el = elements.find((el) => el.id === selectedId);
        if (!el) return;
        setMode("resizing");
        resizeHandleRef.current = handle;
        dragIdRef.current = selectedId;
        const pos = canvasToLocal(e.clientX, e.clientY);
        startPosRef.current = pos;
        startElRef.current = { x: el.x, y: el.y, w: el.width, h: el.height };
    };

    const handleMouseMove = useCallback((e: React.MouseEvent) => {
        if (mode === "none") return;

        if (mode === "panning") {
            setPanOffset({
                x: (e.clientX - panStartRef.current.x) / (zoom / 100),
                y: (e.clientY - panStartRef.current.y) / (zoom / 100),
            });
            return;
        }

        const pos = canvasToLocal(e.clientX, e.clientY);

        if (mode === "drawing" && drawingElRef.current) {
            const startX = Math.min(startPosRef.current.x, pos.x);
            const startY = Math.min(startPosRef.current.y, pos.y);
            const w = Math.abs(pos.x - startPosRef.current.x);
            const h = Math.abs(pos.y - startPosRef.current.y);
            const updated = { ...drawingElRef.current, x: startX, y: startY, width: w, height: h };
            drawingElRef.current = updated;
            setDrawingEl(updated);
            return;
        }

        if (mode === "moving" && dragIdRef.current) {
            const dx = pos.x - startPosRef.current.x;
            const dy = pos.y - startPosRef.current.y;
            onMoveElement(dragIdRef.current, startElRef.current.x + dx, startElRef.current.y + dy);
            return;
        }

        if (mode === "resizing" && dragIdRef.current) {
            const dx = pos.x - startPosRef.current.x;
            const dy = pos.y - startPosRef.current.y;
            const h = resizeHandleRef.current;
            let { x, y, w: width, h: height } = startElRef.current;

            if (h.includes("e")) width = Math.max(10, width + dx);
            if (h.includes("w")) { width = Math.max(10, width - dx); x = startElRef.current.x + dx; }
            if (h.includes("s")) height = Math.max(10, height + dy);
            if (h.includes("n")) { height = Math.max(10, height - dy); y = startElRef.current.y + dy; }

            onResizeElement(dragIdRef.current, width, height, x, y);
            return;
        }
    }, [mode, zoom, panOffset]);

    const handleMouseUp = useCallback(() => {
        if (mode === "drawing" && drawingElRef.current) {
            const el = drawingElRef.current;
            if (el.width > 5 && el.height > 5) {
                onAddElement(el);
                onSelect(el.id);
            }
            drawingElRef.current = null;
            setDrawingEl(null);
        }
        setMode("none");
        dragIdRef.current = null;
    }, [mode, onAddElement, onSelect]);

    const renderElement = (el: CanvasElement) => {
        if (!el.visible) return null;
        const isSelected = selectedId === el.id;
        const baseStyle: React.CSSProperties = {
            position: "absolute", left: el.x, top: el.y,
            width: el.width, height: el.height,
            opacity: el.opacity,
            transform: el.rotation ? `rotate(${el.rotation}deg)` : undefined,
            cursor: activeTool === "select" ? (el.locked ? "default" : "move") : "crosshair",
        };

        const selectionOutline = isSelected ? "0 0 0 2px hsl(25, 80%, 60%)" : undefined;

        const resizeHandles = isSelected && activeTool === "select" && !el.locked && (
            <>
                {["nw", "ne", "sw", "se", "n", "s", "e", "w"].map((pos) => (
                    <div key={pos}
                        onMouseDown={(e) => handleResizeMouseDown(e, pos)}
                        className={`absolute ${pos.length === 2 ? "w-2.5 h-2.5" : pos === "n" || pos === "s" ? "w-4 h-1.5" : "w-1.5 h-4"} bg-white border-2 border-primary rounded-sm z-10`}
                        style={{
                            top: pos.includes("n") ? -5 : pos.includes("s") ? undefined : "50%",
                            bottom: pos.includes("s") ? -5 : undefined,
                            left: pos.includes("w") ? -5 : pos.includes("e") ? undefined : "50%",
                            right: pos.includes("e") ? -5 : undefined,
                            transform: pos.length === 1 && (pos === "n" || pos === "s") ? "translateX(-50%)"
                                : pos.length === 1 ? "translateY(-50%)" : undefined,
                            cursor: `${pos}-resize`,
                        }}
                    />
                ))}
                <div className="absolute -top-6 left-1/2 -translate-x-1/2 bg-primary text-white text-[9px] px-1.5 py-0.5 rounded font-mono whitespace-nowrap z-10">
                    {Math.round(el.width)} × {Math.round(el.height)}
                </div>
            </>
        );

        if (el.type === "rectangle" || el.type === "frame") {
            return (
                <div key={el.id} onMouseDown={(e) => handleElementMouseDown(e, el.id)}
                    style={{ ...baseStyle, background: el.fill, border: el.strokeWidth ? `${el.strokeWidth}px solid ${el.stroke}` : undefined, borderRadius: el.borderRadius, boxShadow: selectionOutline }}>
                    {resizeHandles}
                </div>
            );
        }
        if (el.type === "ellipse") {
            return (
                <div key={el.id} onMouseDown={(e) => handleElementMouseDown(e, el.id)}
                    style={{ ...baseStyle, background: el.fill, borderRadius: "50%", border: el.strokeWidth ? `${el.strokeWidth}px solid ${el.stroke}` : undefined, boxShadow: selectionOutline }}>
                    {resizeHandles}
                </div>
            );
        }
        if (el.type === "text") {
            return (
                <div key={el.id} onMouseDown={(e) => handleElementMouseDown(e, el.id)}
                    style={{ ...baseStyle, color: el.fill, fontSize: el.fontSize, fontWeight: el.fontWeight, fontFamily: "'DM Sans', sans-serif", lineHeight: 1.3, whiteSpace: "pre-wrap", boxShadow: selectionOutline, borderRadius: 2 }}>
                    {el.text}
                    {resizeHandles}
                </div>
            );
        }
        return null;
    };

    const sortedElements = [...elements].sort((a, b) => {
        if (a.type === "frame" && b.type !== "frame") return -1;
        if (a.type !== "frame" && b.type === "frame") return 1;
        return 0;
    });

    return (
        <div className="relative h-full w-full overflow-hidden bg-[hsl(240,10%,6%)]"
            onMouseMove={handleMouseMove} onMouseUp={handleMouseUp} onMouseLeave={handleMouseUp}>
            <div className="absolute inset-0 opacity-30"
                style={{ backgroundSize: "20px 20px", backgroundImage: "radial-gradient(circle, hsl(240, 5%, 15%) 1px, transparent 1px)" }} />
            <div ref={canvasRef} onMouseDown={handleMouseDown}
                className="absolute inset-0"
                style={{ transform: `scale(${zoom / 100}) translate(${panOffset.x}px, ${panOffset.y}px)`, transformOrigin: "0 0" }}>
                {sortedElements.map(renderElement)}
                {drawingEl && renderElement(drawingEl)}
            </div>
            {/* Zoom controls */}
            <div className="absolute bottom-4 right-4 flex items-center gap-1 bg-[hsl(240,10%,7%)] border border-[hsl(240,5%,14%)] rounded-lg p-1 shadow-lg">
                <button onClick={() => setZoom(Math.max(25, zoom - 25))} className="p-1.5 rounded hover:bg-[hsl(240,5%,12%)] text-muted-foreground hover:text-foreground transition-colors">
                    <ZoomOut className="w-3.5 h-3.5" />
                </button>
                <span className="text-[11px] text-muted-foreground font-mono w-10 text-center">{zoom}%</span>
                <button onClick={() => setZoom(Math.min(400, zoom + 25))} className="p-1.5 rounded hover:bg-[hsl(240,5%,12%)] text-muted-foreground hover:text-foreground transition-colors">
                    <ZoomIn className="w-3.5 h-3.5" />
                </button>
            </div>
            {activeTool !== "select" && activeTool !== "hand" && (
                <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-primary/20 border border-primary/30 text-primary text-[11px] px-3 py-1 rounded-full font-medium">
                    Click and drag to draw a {activeTool}
                </div>
            )}
        </div>
    );
}

// ─── Main Design Editor ───────────────────────────────────
export default function DesignEditor() {
    const [, navigate] = useLocation();
    const [elements, setElements] = useState(initialElements);
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const [activeTool, setActiveTool] = useState<Tool>("select");
    const [zoom, setZoom] = useState(100);
    const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });
    const [showCodePreview, setShowCodePreview] = useState(false);

    // Undo/Redo
    const [history, setHistory] = useState<CanvasElement[][]>([initialElements]);
    const [historyIndex, setHistoryIndex] = useState(0);

    const pushHistory = useCallback((newElements: CanvasElement[]) => {
        setHistory((prev) => {
            const trimmed = prev.slice(0, historyIndex + 1);
            return [...trimmed, newElements];
        });
        setHistoryIndex((prev) => prev + 1);
    }, [historyIndex]);

    const undo = useCallback(() => {
        if (historyIndex > 0) {
            setHistoryIndex((prev) => prev - 1);
            setElements(history[historyIndex - 1]);
        }
    }, [historyIndex, history]);

    const redo = useCallback(() => {
        if (historyIndex < history.length - 1) {
            setHistoryIndex((prev) => prev + 1);
            setElements(history[historyIndex + 1]);
        }
    }, [historyIndex, history]);

    const selectedElement = elements.find((el) => el.id === selectedId) || null;

    const handleUpdateElement = useCallback((id: string, updates: Partial<CanvasElement>) => {
        setElements((prev) => {
            const next = prev.map((el) => (el.id === id ? { ...el, ...updates } : el));
            pushHistory(next);
            return next;
        });
    }, [pushHistory]);

    const handleMoveElement = useCallback((id: string, x: number, y: number) => {
        // Live update without pushing history (pushed on mouse up)
        setElements((prev) => prev.map((el) => (el.id === id ? { ...el, x, y } : el)));
    }, []);

    const handleResizeElement = useCallback((id: string, w: number, h: number, x: number, y: number) => {
        setElements((prev) => prev.map((el) => (el.id === id ? { ...el, width: w, height: h, x, y } : el)));
    }, []);

    const handleAddElement = useCallback((el: CanvasElement) => {
        setElements((prev) => {
            const next = [...prev, el];
            pushHistory(next);
            return next;
        });
        setActiveTool("select");
    }, [pushHistory]);

    const handleAddLayerElement = useCallback(() => {
        const el: CanvasElement = {
            id: nextId(), type: "rectangle", name: "New Rectangle",
            x: 200 + Math.random() * 200, y: 200 + Math.random() * 200,
            width: 150, height: 100,
            fill: "#6390ff", stroke: "transparent", strokeWidth: 0,
            opacity: 1, rotation: 0, borderRadius: 8,
            locked: false, visible: true,
        };
        setElements((prev) => {
            const next = [...prev, el];
            pushHistory(next);
            return next;
        });
        setSelectedId(el.id);
    }, [pushHistory]);

    const handleToggleVisibility = useCallback((id: string) => {
        setElements((prev) => prev.map((el) => (el.id === id ? { ...el, visible: !el.visible } : el)));
    }, []);

    const handleToggleLock = useCallback((id: string) => {
        setElements((prev) => prev.map((el) => (el.id === id ? { ...el, locked: !el.locked } : el)));
    }, []);

    const handleDuplicate = useCallback((id: string) => {
        const el = elements.find((e) => e.id === id);
        if (!el) return;
        const newEl = { ...el, id: nextId(), name: `${el.name} Copy`, x: el.x + 20, y: el.y + 20 };
        setElements((prev) => {
            const next = [...prev, newEl];
            pushHistory(next);
            return next;
        });
        setSelectedId(newEl.id);
    }, [elements, pushHistory]);

    const handleDelete = useCallback((id: string) => {
        setElements((prev) => {
            const next = prev.filter((el) => el.id !== id).map((el) =>
                el.children ? { ...el, children: el.children.filter((c) => c !== id) } : el
            );
            pushHistory(next);
            return next;
        });
        setSelectedId(null);
    }, [pushHistory]);

    const handleExport = useCallback(() => {
        const canvas = document.createElement("canvas");
        canvas.width = 1920;
        canvas.height = 1080;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;
        ctx.fillStyle = "#0f172a";
        ctx.fillRect(0, 0, 1920, 1080);

        const sorted = [...elements].sort((a, b) => {
            if (a.type === "frame" && b.type !== "frame") return -1;
            if (a.type !== "frame" && b.type === "frame") return 1;
            return 0;
        });

        for (const el of sorted) {
            if (!el.visible) continue;
            ctx.save();
            ctx.globalAlpha = el.opacity;
            if (el.rotation) {
                ctx.translate(el.x + el.width / 2, el.y + el.height / 2);
                ctx.rotate((el.rotation * Math.PI) / 180);
                ctx.translate(-(el.x + el.width / 2), -(el.y + el.height / 2));
            }
            if (el.type === "ellipse") {
                ctx.beginPath();
                ctx.ellipse(el.x + el.width / 2, el.y + el.height / 2, el.width / 2, el.height / 2, 0, 0, Math.PI * 2);
                if (!el.fill.startsWith("linear")) { ctx.fillStyle = el.fill; ctx.fill(); }
                if (el.strokeWidth && el.stroke !== "transparent") { ctx.strokeStyle = el.stroke; ctx.lineWidth = el.strokeWidth; ctx.stroke(); }
            } else if (el.type === "text") {
                ctx.fillStyle = el.fill;
                ctx.font = `${el.fontWeight || "400"} ${el.fontSize || 16}px 'DM Sans', sans-serif`;
                const lines = (el.text || "").split("\n");
                lines.forEach((line, i) => ctx.fillText(line, el.x, el.y + (el.fontSize || 16) * (i + 1)));
            } else {
                if (!el.fill.startsWith("linear")) { ctx.fillStyle = el.fill; ctx.fillRect(el.x, el.y, el.width, el.height); }
                if (el.strokeWidth && el.stroke !== "transparent") { ctx.strokeStyle = el.stroke; ctx.lineWidth = el.strokeWidth; ctx.strokeRect(el.x, el.y, el.width, el.height); }
            }
            ctx.restore();
        }

        canvas.toBlob((blob) => {
            if (!blob) return;
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = "synapse-design.png";
            a.click();
            URL.revokeObjectURL(url);
        });
    }, [elements]);

    // Shared HTML generation
    const generateHTML = useCallback((els: CanvasElement[]) => {
        const sorted = [...els].filter((el) => el.visible).sort((a, b) => {
            if (a.type === "frame" && b.type !== "frame") return -1;
            if (a.type !== "frame" && b.type === "frame") return 1;
            return 0;
        });

        const elHtmlParts = sorted.map((el) => {
            const style: string[] = [
                `position: absolute`,
                `left: ${el.x}px`,
                `top: ${el.y}px`,
                `width: ${el.width}px`,
                `height: ${el.height}px`,
                `opacity: ${el.opacity}`,
            ];
            if (el.rotation) style.push(`transform: rotate(${el.rotation}deg)`);
            if (el.borderRadius && el.type !== "ellipse") style.push(`border-radius: ${el.borderRadius}px`);
            if (el.strokeWidth && el.stroke !== "transparent") style.push(`border: ${el.strokeWidth}px solid ${el.stroke}`);

            if (el.type === "ellipse") {
                style.push(`border-radius: 50%`);
                style.push(`background: ${el.fill}`);
                return `    <div class="element" style="${style.join("; ")}" data-name="${el.name}"></div>`;
            }
            if (el.type === "text") {
                style.push(`color: ${el.fill}`);
                style.push(`font-size: ${el.fontSize || 16}px`);
                style.push(`font-weight: ${el.fontWeight || "400"}`);
                style.push(`font-family: 'Inter', 'DM Sans', sans-serif`);
                style.push(`line-height: 1.3`);
                style.push(`white-space: pre-wrap`);
                const textContent = (el.text || "").replace(/\n/g, "<br>");
                return `    <div class="element" style="${style.join("; ")}" data-name="${el.name}">${textContent}</div>`;
            }
            style.push(`background: ${el.fill}`);
            return `    <div class="element" style="${style.join("; ")}" data-name="${el.name}"></div>`;
        });

        return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Synapse Design Export</title>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&family=DM+Sans:wght@400;500;700&display=swap" rel="stylesheet">
  <style>
    *, *::before, *::after { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      background: #0a0a0f;
      display: flex;
      justify-content: center;
      align-items: flex-start;
      min-height: 100vh;
      padding: 40px;
      font-family: 'Inter', 'DM Sans', sans-serif;
    }
    .canvas {
      position: relative;
      width: 1920px;
      height: 1080px;
      overflow: hidden;
    }
    .element { transition: opacity 0.2s; }
  </style>
</head>
<body>
  <div class="canvas">
${elHtmlParts.join("\n")}
  </div>
</body>
</html>`;
    }, []);

    const htmlPreviewCode = useMemo(() => generateHTML(elements), [elements, generateHTML]);

    const handleExportHTML = useCallback(() => {
        const html = generateHTML(elements);
        const blob = new Blob([html], { type: "text/html" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = "synapse-design.html";
        a.click();
        URL.revokeObjectURL(url);
    }, [elements, generateHTML]);

    const handleCopyHTML = useCallback(() => {
        navigator.clipboard.writeText(htmlPreviewCode);
    }, [htmlPreviewCode]);

    // Keyboard shortcuts
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

            if ((e.ctrlKey || e.metaKey) && e.key === "z" && !e.shiftKey) { e.preventDefault(); undo(); return; }
            if ((e.ctrlKey || e.metaKey) && (e.key === "y" || (e.key === "z" && e.shiftKey))) { e.preventDefault(); redo(); return; }
            if (e.key === "Delete" || e.key === "Backspace") { if (selectedId) handleDelete(selectedId); return; }
            if ((e.ctrlKey || e.metaKey) && e.key === "d") { e.preventDefault(); if (selectedId) handleDuplicate(selectedId); return; }

            switch (e.key.toLowerCase()) {
                case "v": setActiveTool("select"); break;
                case "h": setActiveTool("hand"); break;
                case "r": setActiveTool("rectangle"); break;
                case "o": setActiveTool("ellipse"); break;
                case "t": setActiveTool("text"); break;
                case "p": setActiveTool("pen"); break;
                case "l": setActiveTool("line"); break;
                case "escape": setSelectedId(null); setActiveTool("select"); break;
            }
        };
        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [undo, redo, selectedId, handleDelete, handleDuplicate]);

    // Push history on mouse up for move/resize (debounced)
    useEffect(() => {
        const handleMouseUp = () => {
            // Push current state to history after move/resize
            setHistory((prev) => {
                const last = prev[prev.length - 1];
                if (JSON.stringify(last) !== JSON.stringify(elements)) {
                    return [...prev, elements];
                }
                return prev;
            });
            setHistoryIndex((prev) => prev);
        };
        window.addEventListener("mouseup", handleMouseUp);
        return () => window.removeEventListener("mouseup", handleMouseUp);
    }, [elements]);

    return (
        <div className="h-screen w-screen flex flex-col overflow-hidden bg-[hsl(240,10%,3%)]">
            {/* Top Bar */}
            <div className="h-12 bg-[hsl(240,10%,5%)] border-b border-[hsl(240,5%,12%)] flex items-center justify-between px-3 select-none shrink-0">
                <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2 cursor-pointer hover:opacity-80 transition-opacity" onClick={() => navigate("/")}>
                        <img src="/logo.png" alt="Synapse" className="w-6 h-6 rounded-md object-cover" />
                        <span className="font-display font-semibold text-sm">Synapse</span>
                    </div>
                    <div className="h-4 w-px bg-[hsl(240,5%,15%)]" />
                    <span className="text-sm text-muted-foreground font-medium">Untitled Design</span>
                </div>

                <Toolbar activeTool={activeTool} setActiveTool={setActiveTool} />

                <div className="flex items-center gap-2">
                    <button onClick={undo} disabled={historyIndex <= 0}
                        title="Undo (Ctrl+Z)"
                        className="p-1.5 rounded-md hover:bg-[hsl(240,5%,12%)] text-muted-foreground hover:text-foreground transition-colors disabled:opacity-30 disabled:cursor-not-allowed">
                        <Undo2 className="w-4 h-4" />
                    </button>
                    <button onClick={redo} disabled={historyIndex >= history.length - 1}
                        title="Redo (Ctrl+Y)"
                        className="p-1.5 rounded-md hover:bg-[hsl(240,5%,12%)] text-muted-foreground hover:text-foreground transition-colors disabled:opacity-30 disabled:cursor-not-allowed">
                        <Redo2 className="w-4 h-4" />
                    </button>
                    <div className="h-4 w-px bg-[hsl(240,5%,15%)] mx-1" />
                    <button onClick={() => setShowCodePreview(!showCodePreview)}
                        title="Toggle code preview"
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                            showCodePreview
                                ? "bg-amber-500/20 text-amber-400 border-amber-500/30"
                                : "bg-[hsl(240,10%,8%)] text-muted-foreground border-[hsl(240,5%,14%)] hover:text-foreground"
                        }`}>
                        <Code2 className="w-3 h-3" />
                        Code
                    </button>
                    <button onClick={handleExport}
                        title="Export as PNG"
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary/20 text-primary text-xs font-medium border border-primary/30 hover:bg-primary/30 transition-colors">
                        <Download className="w-3 h-3" />
                        PNG
                    </button>
                    <button onClick={handleExportHTML}
                        title="Download design as HTML code"
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500/20 text-emerald-400 text-xs font-medium border border-emerald-500/30 hover:bg-emerald-500/30 transition-colors">
                        <Download className="w-3 h-3" />
                        HTML
                    </button>
                    <div className="w-7 h-7 rounded-full bg-gradient-to-br from-primary to-amber-500 flex items-center justify-center text-[10px] font-bold text-white ml-1 cursor-pointer hover:opacity-90"
                        onClick={() => navigate("/dashboard")}>
                        U
                    </div>
                </div>
            </div>

            {/* Main layout */}
            <div className="flex-1 flex overflow-hidden">
                <div className="w-56 border-r border-[hsl(240,5%,12%)] shrink-0">
                    <LayersPanel
                        elements={elements} selectedId={selectedId}
                        onSelect={setSelectedId}
                        onToggleVisibility={handleToggleVisibility}
                        onToggleLock={handleToggleLock}
                        onAddElement={handleAddLayerElement}
                    />
                </div>
                <div className="flex-1">
                    <Canvas
                        elements={elements} selectedId={selectedId} onSelect={setSelectedId}
                        activeTool={activeTool}
                        onMoveElement={(id, x, y) => handleMoveElement(id, x, y)}
                        onAddElement={handleAddElement}
                        onResizeElement={handleResizeElement}
                        panOffset={panOffset} setPanOffset={setPanOffset}
                        zoom={zoom} setZoom={setZoom}
                    />
                </div>
                {/* Code Preview Panel */}
                {showCodePreview && (
                    <div className="w-[400px] border-l border-[hsl(240,5%,12%)] shrink-0 flex flex-col bg-[hsl(240,10%,4%)]">
                        <div className="flex items-center justify-between px-3 py-2 border-b border-[hsl(240,5%,12%)] bg-[hsl(240,10%,5%)]">
                            <div className="flex items-center gap-2">
                                <Code2 className="w-3.5 h-3.5 text-amber-400" />
                                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">HTML Code</span>
                            </div>
                            <div className="flex items-center gap-1">
                                <button onClick={handleCopyHTML}
                                    className="flex items-center gap-1 px-2 py-1 rounded text-[10px] font-medium text-muted-foreground hover:text-foreground hover:bg-[hsl(240,5%,12%)] transition-colors"
                                    title="Copy HTML">
                                    <Copy className="w-3 h-3" />
                                    Copy
                                </button>
                                <button onClick={handleExportHTML}
                                    className="flex items-center gap-1 px-2 py-1 rounded text-[10px] font-medium text-emerald-400 hover:bg-emerald-500/10 transition-colors"
                                    title="Download HTML">
                                    <Download className="w-3 h-3" />
                                    Download
                                </button>
                            </div>
                        </div>
                        <ScrollArea className="flex-1">
                            <pre className="p-3 text-[11px] leading-relaxed font-mono text-muted-foreground whitespace-pre overflow-x-auto">
                                <code>{htmlPreviewCode}</code>
                            </pre>
                        </ScrollArea>
                    </div>
                )}

                <div className="w-64 border-l border-[hsl(240,5%,12%)] shrink-0">
                    <PropertiesPanel
                        element={selectedElement}
                        onUpdate={handleUpdateElement}
                        onDuplicate={handleDuplicate}
                        onDelete={handleDelete}
                    />
                </div>
            </div>

            {/* Status Bar */}
            <div className="h-6 bg-[hsl(240,10%,5%)] border-t border-[hsl(240,5%,12%)] flex items-center justify-between px-3 text-[11px] text-muted-foreground select-none shrink-0">
                <div className="flex items-center gap-3">
                    <span>{elements.length} elements</span>
                    <span>·</span>
                    <span>1 page</span>
                </div>
                <div className="flex items-center gap-3">
                    <span className="flex items-center gap-1">
                        <Move className="w-3 h-3" />
                        {selectedElement ? `${Math.round(selectedElement.x)}, ${Math.round(selectedElement.y)}` : "—"}
                    </span>
                    <span>Canvas: 1920×1080</span>
                </div>
            </div>
        </div>
    );
}
