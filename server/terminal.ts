import { WebSocketServer, type WebSocket } from "ws";
import type { Server } from "http";
import * as pty from "node-pty";
import { storage } from "./storage";

const isWindows = process.platform === "win32";

export function setupTerminalWebSocket(httpServer: Server): void {
  const wss = new WebSocketServer({ server: httpServer, path: "/ws/terminal" });

  wss.on("connection", async (ws: WebSocket, req) => {
    const requestUrl = new URL(req.url || "/ws/terminal", "http://localhost");
    const token = requestUrl.searchParams.get("token");
    const user = token ? await storage.getUserByAuthToken(token) : undefined;

    if (!user) {
      ws.send("\r\n[Unauthorized terminal session]\r\n");
      ws.close();
      return;
    }

    const shell = isWindows ? "powershell.exe" : "/bin/bash";
    const shellArgs = isWindows ? ["-NoLogo"] : ["--login"];

    let ptyProcess: pty.IPty | null = null;

    try {
      ptyProcess = pty.spawn(shell, shellArgs, {
        name: "xterm-256color",
        cols: 80,
        rows: 24,
        cwd: process.cwd(),
        env: process.env as Record<string, string>,
      });

      // Stream PTY output to the WebSocket
      ptyProcess.onData((data: string) => {
        if (ws.readyState === ws.OPEN) {
          ws.send(data);
        }
      });

      ptyProcess.onExit(({ exitCode }) => {
        if (ws.readyState === ws.OPEN) {
          ws.send(`\r\n[Process exited with code ${exitCode}]\r\n`);
          ws.close();
        }
      });

      // Receive input from the WebSocket and write to PTY
      ws.on("message", (message: Buffer | string) => {
        const data = typeof message === "string" ? message : message.toString("utf-8");

        // Handle resize messages
        try {
          const parsed = JSON.parse(data);
          if (parsed.type === "resize" && parsed.cols && parsed.rows) {
            ptyProcess?.resize(parsed.cols, parsed.rows);
            return;
          }
        } catch {
          // Not JSON, treat as regular terminal input
        }

        ptyProcess?.write(data);
      });

      ws.on("close", () => {
        ptyProcess?.kill();
        ptyProcess = null;
      });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Unknown error";
      if (ws.readyState === ws.OPEN) {
        ws.send(`\r\n[Failed to start shell: ${errorMessage}]\r\n`);
        ws.close();
      }
    }
  });
}
