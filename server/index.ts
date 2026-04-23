import "dotenv/config";
import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import adminRoutes from "./adminRoutes";
import nlpDeploymentRoutes from "./nlpDeploymentAPI";
import githubWebhookRoutes from "./githubWebhook";
import brainAPIRoutes, { initializeBrainAPI } from "./brainAPI";
import agentLogsRoutes, { initializeAgentLogs, addAgentLog } from "./agentLogsAPI";
import { serveStatic } from "./static";
import { createServer } from "http";
import { Server as SocketIOServer } from "socket.io";
import { setupTerminalWebSocket } from "./terminal";
import { AgentOrchestrator } from "../agent/index.js";

const app = express();
const httpServer = createServer(app);

declare module "http" {
  interface IncomingMessage {
    rawBody: unknown;
  }
}

app.use(
  express.json({
    verify: (req, _res, buf) => {
      req.rawBody = buf;
    },
  }),
);

app.use(express.urlencoded({ extended: false }));

app.use("/api/admin", adminRoutes);
app.use("/api/nlp", nlpDeploymentRoutes);
app.use("/api/github", githubWebhookRoutes);
app.use("/api/brain", brainAPIRoutes);
app.use("/api/agent", agentLogsRoutes);

export function log(message: string, source = "express") {
  const formattedTime = new Date().toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });

  console.log(`${formattedTime} [${source}] ${message}`);
}

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      log(logLine);
    }
  });

  next();
});

(async () => {
  await registerRoutes(httpServer, app);
  setupTerminalWebSocket(httpServer);

  app.use((err: any, _req: Request, res: Response, next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    console.error("Internal Server Error:", err);

    if (res.headersSent) {
      return next(err);
    }

    return res.status(status).json({ message });
  });

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (process.env.NODE_ENV === "production") {
    serveStatic(app);
  } else {
    const { setupVite } = await import("./vite");
    await setupVite(httpServer, app);
  }

  // Initialize Agent Brain
  const orchestrator = new AgentOrchestrator({
    logger: console,
    enableBrain: true,
    autoStartBrain: false, // Don't auto-start, let API control it
    locusApiKey: process.env.LOCUS_API_KEY,
    locusApiUrl: process.env.LOCUS_API_URL,
    aiProvider: 'openai',
    apiKeys: {
      openai: process.env.OPENAI_API_KEY
    }
  });

  // Initialize Socket.IO
  const io = new SocketIOServer(httpServer, {
    cors: {
      origin: process.env.NODE_ENV === "development" ? "http://localhost:5000" : false,
      methods: ["GET", "POST"]
    }
  });

  // Initialize brain API with orchestrator
  initializeBrainAPI(orchestrator);
  
  // Initialize agent logs with Socket.IO
  initializeAgentLogs(io);
  
  // Make addAgentLog globally available for the brain
  (global as any).addAgentLog = addAgentLog;
  
  log('🧠 Agent Brain initialized and ready for API control');
  log('📡 Socket.IO initialized for real-time agent logs');

  // ALWAYS serve the app on the port specified in the environment variable PORT
  // Other ports are firewalled. Default to 5000 if not specified.
  // this serves both the API and the client.
  // It is the only port that is not firewalled.
  const port = parseInt(process.env.PORT || "5000", 10);
  httpServer.listen(
    {
      port,
      host: "0.0.0.0",
    },
    () => {
      log(`serving on port ${port}`);
    },
  );
})();
