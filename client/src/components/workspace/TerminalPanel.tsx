import { useEffect, useRef, useState, forwardRef, useImperativeHandle } from "react";
import { Terminal as TerminalIcon, Plus, X, RotateCcw } from "lucide-react";
import { Terminal } from "@xterm/xterm";
import { FitAddon } from "@xterm/addon-fit";
import { getAuthToken } from "@/lib/queryClient";
import "@xterm/xterm/css/xterm.css";

interface TerminalTab {
    id: string;
    name: string;
}

export interface TerminalPanelHandle {
    writeCommand: (command: string) => void;
    focus: () => void;
}

const TerminalPanel = forwardRef<TerminalPanelHandle>(function TerminalPanel(_props, ref) {
    const termRef = useRef<HTMLDivElement>(null);
    const terminalInstance = useRef<Terminal | null>(null);
    const fitAddon = useRef<FitAddon | null>(null);
    const wsRef = useRef<WebSocket | null>(null);
    const [tabs] = useState<TerminalTab[]>([
        { id: "1", name: "Terminal" },
    ]);
    const [activeTerminal] = useState("1");
    const [isConnected, setIsConnected] = useState(false);

    useImperativeHandle(ref, () => ({
        writeCommand(command: string) {
            if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
                wsRef.current.send(command + "\r");
            }
        },
        focus() {
            terminalInstance.current?.focus();
        },
    }));

    const connectTerminal = () => {
        // Clean up previous instances
        if (wsRef.current) {
            wsRef.current.close();
            wsRef.current = null;
        }
        if (terminalInstance.current) {
            terminalInstance.current.dispose();
            terminalInstance.current = null;
        }

        if (!termRef.current) return;

        const term = new Terminal({
            cursorBlink: true,
            fontSize: 13,
            fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Courier New", monospace',
            lineHeight: 1.5,
            theme: {
                background: "#0a0a0f",
                foreground: "#e4e4e7",
                cursor: "#f97316",
                cursorAccent: "#0a0a0f",
                selectionBackground: "#f9731640",
                black: "#18181b",
                red: "#ef4444",
                green: "#22c55e",
                yellow: "#eab308",
                blue: "#3b82f6",
                magenta: "#a855f7",
                cyan: "#06b6d4",
                white: "#e4e4e7",
                brightBlack: "#52525b",
                brightRed: "#f87171",
                brightGreen: "#4ade80",
                brightYellow: "#facc15",
                brightBlue: "#60a5fa",
                brightMagenta: "#c084fc",
                brightCyan: "#22d3ee",
                brightWhite: "#fafafa",
            },
        });

        const fit = new FitAddon();
        term.loadAddon(fit);
        term.open(termRef.current);

        // Small delay to let the DOM settle before fitting
        requestAnimationFrame(() => {
            try {
                fit.fit();
            } catch {
                // ignore fit errors on initial render        
            }
        });

        terminalInstance.current = term;
        fitAddon.current = fit;

        // Connect to WebSocket
        let ws: WebSocket | null = null;
        
        try {
            const wsProtocol = window.location.protocol === "https:" ? "wss:" : "ws:";
            const token = getAuthToken();
            const tokenQuery = token ? `?token=${encodeURIComponent(token)}` : "";
            const wsUrl = `${wsProtocol}//${window.location.host}/ws/terminal${tokenQuery}`;

            ws = new WebSocket(wsUrl);
            wsRef.current = ws;

            ws.onopen = () => {
                setIsConnected(true);
                term.writeln("\x1b[1;32m✓ Terminal connected\x1b[0m");
                term.writeln("");
                term.focus();
            };

            ws.onmessage = (event) => {
                term.write(event.data);
            };

            ws.onclose = () => {
                setIsConnected(false);
                term.writeln("");
                term.writeln("\x1b[1;31m✗ Terminal disconnected\x1b[0m");
            };

            ws.onerror = () => {
                setIsConnected(false);
                term.writeln("\x1b[1;31m✗ Connection error (click refresh to retry)\x1b[0m");
            };
        } catch (error) {
            setIsConnected(false);
            term.writeln("\x1b[1;31m✗ Failed to connect to terminal\x1b[0m");
        }

        // Send terminal input to WebSocket
        term.onData((data) => {
            if (ws && ws.readyState === WebSocket.OPEN) {
                ws.send(data);
            }
        });

        // Handle resize
        const resizeObserver = new ResizeObserver(() => {
            try {
                fit.fit();
                if (ws && ws.readyState === WebSocket.OPEN) {
                    ws.send(JSON.stringify({
                        type: "resize",
                        cols: term.cols,
                        rows: term.rows,
                    }));
                }
            } catch {
                // ignore resize errors
            }
        });

        resizeObserver.observe(termRef.current);

        return () => {
            resizeObserver.disconnect();
        };
    };

    useEffect(() => {
        // Small delay to ensure server is ready before attempting WebSocket connection
        const timer = setTimeout(() => {
            connectTerminal();
        }, 500);

        return () => {
            clearTimeout(timer);
            if (wsRef.current) {
                wsRef.current.close();
                wsRef.current = null;
            }
            if (terminalInstance.current) {
                terminalInstance.current.dispose();
                terminalInstance.current = null;
            }
        };
    }, []);

    const handleReconnect = () => {
        connectTerminal();
    };

    return (
        <div className="h-full flex flex-col bg-[hsl(240,10%,3%)]" data-terminal-container>
            {/* Terminal header */}
            <div className="flex items-center justify-between border-b border-[hsl(240,5%,12%)] bg-[hsl(240,10%,5%)]">
                <div className="flex items-center">
                    {tabs.map((tab) => (
                        <button
                            key={tab.id}
                            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs border-r border-[hsl(240,5%,12%)] transition-colors ${activeTerminal === tab.id
                                ? "text-foreground bg-[hsl(240,10%,3%)]"
                                : "text-muted-foreground hover:text-foreground bg-[hsl(240,10%,6%)]"
                                }`}
                        >
                            <TerminalIcon className="w-3 h-3" />
                            {tab.name}
                            <span className={`w-1.5 h-1.5 rounded-full ${isConnected ? "bg-emerald-500" : "bg-red-500"}`} />
                        </button>
                    ))}
                    <button className="p-1.5 text-muted-foreground hover:text-foreground transition-colors">
                        <Plus className="w-3.5 h-3.5" />
                    </button>
                </div>
                <div className="flex items-center gap-1 pr-2">
                    <button
                        onClick={handleReconnect}
                        className="p-1 rounded hover:bg-[hsl(240,5%,15%)] text-muted-foreground hover:text-foreground transition-colors"
                        title="Reconnect terminal"
                    >
                        <RotateCcw className="w-3 h-3" />
                    </button>
                </div>
            </div>

            {/* Terminal content */}
            <div
                ref={termRef}
                className="flex-1 overflow-hidden"
                onClick={() => terminalInstance.current?.focus()}
            />
        </div>
    );
});

export default TerminalPanel;
