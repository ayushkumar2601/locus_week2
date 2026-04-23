import { type User, type InsertUser } from "@shared/schema";
import Database from "better-sqlite3";
import { randomUUID } from "crypto";
import { mkdirSync } from "fs";
import path from "path";

export type ProjectFile = {
  content: string;
  language: string;
};

export type ProjectData = {
  id: string;
  userId: string;
  name: string;
  files: Record<string, ProjectFile>;
  createdAt: string;
  updatedAt: string;
};

export type ProjectInsightData = {
  userId: string;
  projectId: string;
  insights: string[];
  createdAt: string;
};

export type ChatwootIntegrationData = {
  userId: string;
  projectId: string;
  websiteToken: string;
  chatwootUrl: string;
  createdAt: string;
  updatedAt: string;
};

export type DashboardHistoryItem = {
  id: string;
  name: string;
  type: string;
  date: string;
  status: "Completed" | "In Progress";
};

export type DashboardData = {
  profile: {
    name: string;
    email: string;
  };
  stats: {
    totalProjects: number;
    aiGenerations: number;
  };
  history: DashboardHistoryItem[];
};

export type ChatMessageData = {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: string;
  model?: string;
};

export interface IStorage {
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getAnyUser(): Promise<User | undefined>;
  getUserByAuthToken(token: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUserPassword(userId: string, password: string): Promise<User | undefined>;
  createAuthToken(userId: string): Promise<string>;
  revokeAuthToken(token: string): Promise<void>;
  getDashboardData(userId: string, username: string): Promise<DashboardData>;
  getChatMessages(userId: string): Promise<ChatMessageData[]>;
  appendChatMessage(userId: string, message: ChatMessageData): Promise<void>;
  clearChatMessages(userId: string): Promise<void>;
  incrementAIGenerationCount(userId: string, username: string): Promise<void>;
  createProject(userId: string, name: string, files: Record<string, ProjectFile>): Promise<ProjectData>;
  getProjectsByUser(userId: string): Promise<ProjectData[]>;
  getProject(projectId: string): Promise<ProjectData | undefined>;
  updateProjectFiles(projectId: string, files: Record<string, ProjectFile>): Promise<ProjectData | undefined>;
  deleteProject(projectId: string): Promise<boolean>;
  renameProject(projectId: string, name: string): Promise<ProjectData | undefined>;
  getProjectInsights(userId: string, projectId: string): Promise<ProjectInsightData | undefined>;
  upsertProjectInsights(userId: string, projectId: string, insights: string[]): Promise<ProjectInsightData>;
  shouldRefreshProjectInsights(userId: string, projectId: string, maxAgeHours: number): Promise<boolean>;
  getProjectChatwootIntegration(userId: string, projectId: string): Promise<ChatwootIntegrationData | undefined>;
  upsertProjectChatwootIntegration(
    userId: string,
    projectId: string,
    websiteToken: string,
    chatwootUrl: string,
  ): Promise<ChatwootIntegrationData>;
}

type UserRow = {
  id: string;
  username: string;
  password: string;
};

type ProjectRow = {
  id: string;
  user_id: string;
  name: string;
  files_json: string;
  created_at: string;
  updated_at: string;
};

type ChatRow = {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: string;
  model: string | null;
};

type InsightRow = {
  user_id: string;
  project_id: string;
  insights_json: string;
  created_at: string;
};

type IntegrationRow = {
  user_id: string;
  project_id: string;
  website_token: string;
  chatwoot_url: string;
  created_at: string;
  updated_at: string;
};

export class FileStorage implements IStorage {
  private db: Database.Database;

  constructor(filePath?: string) {
    const configured = filePath || process.env.STORAGE_DB_PATH;
    const resolvedPath = configured || path.resolve(process.cwd(), "data", "app.db");

    if (resolvedPath !== ":memory:") {
      mkdirSync(path.dirname(resolvedPath), { recursive: true });
    }

    this.db = new Database(resolvedPath);
    this.db.pragma("journal_mode = WAL");
    this.db.pragma("foreign_keys = ON");
    this.initializeSchema();
  }

  private initializeSchema(): void {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        username TEXT NOT NULL UNIQUE,
        password TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS dashboards (
        user_id TEXT PRIMARY KEY,
        profile_email TEXT NOT NULL,
        ai_generations INTEGER NOT NULL DEFAULT 0,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS auth_tokens (
        token TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        created_at TEXT NOT NULL,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS chats (
        seq INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id TEXT NOT NULL,
        id TEXT NOT NULL,
        role TEXT NOT NULL,
        content TEXT NOT NULL,
        timestamp TEXT NOT NULL,
        model TEXT,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS projects (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        name TEXT NOT NULL,
        files_json TEXT NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      );

      CREATE INDEX IF NOT EXISTS idx_projects_user_updated
      ON projects(user_id, updated_at DESC);

      CREATE TABLE IF NOT EXISTS project_insights (
        user_id TEXT NOT NULL,
        project_id TEXT NOT NULL,
        insights_json TEXT NOT NULL,
        created_at TEXT NOT NULL,
        PRIMARY KEY (user_id, project_id),
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS project_integrations (
        user_id TEXT NOT NULL,
        project_id TEXT NOT NULL,
        website_token TEXT NOT NULL,
        chatwoot_url TEXT NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        PRIMARY KEY (user_id, project_id),
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
      );
    `);
  }

  private parseFiles(json: string): Record<string, ProjectFile> {
    try {
      const parsed = JSON.parse(json) as Record<string, ProjectFile>;
      return parsed && typeof parsed === "object" ? parsed : {};
    } catch {
      return {};
    }
  }

  private parseInsights(json: string): string[] {
    try {
      const parsed = JSON.parse(json) as string[];
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  private toProjectData(row: ProjectRow): ProjectData {
    return {
      id: row.id,
      userId: row.user_id,
      name: row.name,
      files: this.parseFiles(row.files_json),
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  private buildDefaultDashboard(username: string): DashboardData {
    return {
      profile: {
        name: username,
        email: `${username}@synapse.local`,
      },
      stats: {
        totalProjects: 0,
        aiGenerations: 0,
      },
      history: [],
    };
  }

  async getUser(id: string): Promise<User | undefined> {
    const row = this.db
      .prepare("SELECT id, username, password FROM users WHERE id = ?")
      .get(id) as UserRow | undefined;
    return row;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const row = this.db
      .prepare("SELECT id, username, password FROM users WHERE username = ?")
      .get(username) as UserRow | undefined;
    return row;
  }

  async getAnyUser(): Promise<User | undefined> {
    const row = this.db
      .prepare("SELECT id, username, password FROM users LIMIT 1")
      .get() as UserRow | undefined;
    return row;
  }

  async getUserByAuthToken(token: string): Promise<User | undefined> {
    const row = this.db
      .prepare(
        `SELECT u.id, u.username, u.password
         FROM auth_tokens t
         JOIN users u ON u.id = t.user_id
         WHERE t.token = ?`,
      )
      .get(token) as UserRow | undefined;

    return row;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = randomUUID();
    this.db
      .prepare("INSERT INTO users (id, username, password) VALUES (?, ?, ?)")
      .run(id, insertUser.username, insertUser.password);

    this.db
      .prepare("INSERT INTO dashboards (user_id, profile_email, ai_generations) VALUES (?, ?, 0)")
      .run(id, `${insertUser.username}@synapse.local`);

    return {
      id,
      username: insertUser.username,
      password: insertUser.password,
    };
  }

  async updateUserPassword(userId: string, password: string): Promise<User | undefined> {
    const existing = await this.getUser(userId);
    if (!existing) {
      return undefined;
    }

    this.db
      .prepare("UPDATE users SET password = ? WHERE id = ?")
      .run(password, userId);

    return {
      ...existing,
      password,
    };
  }

  async createAuthToken(userId: string): Promise<string> {
    const token = randomUUID().replace(/-/g, "") + randomUUID().replace(/-/g, "");
    this.db
      .prepare("INSERT INTO auth_tokens (token, user_id, created_at) VALUES (?, ?, ?)")
      .run(token, userId, new Date().toISOString());

    return token;
  }

  async revokeAuthToken(token: string): Promise<void> {
    this.db.prepare("DELETE FROM auth_tokens WHERE token = ?").run(token);
  }

  async getDashboardData(userId: string, username: string): Promise<DashboardData> {
    const userProjects = this.db
      .prepare(
        `SELECT id, user_id, name, files_json, created_at, updated_at
         FROM projects
         WHERE user_id = ?
         ORDER BY updated_at DESC`,
      )
      .all(userId) as ProjectRow[];

    const totalProjects = userProjects.length;
    const sortedProjects = userProjects.slice(0, 10).map((row) => this.toProjectData(row));

    const history: DashboardHistoryItem[] = sortedProjects.map((p) => {
      const updatedDate = new Date(p.updatedAt);
      const now = new Date();
      const diffMs = now.getTime() - updatedDate.getTime();
      const diffMins = Math.floor(diffMs / 60000);
      const diffHours = Math.floor(diffMins / 60);
      const diffDays = Math.floor(diffHours / 24);

      let dateStr: string;
      if (diffMins < 1) {
        dateStr = "Just now";
      } else if (diffMins < 60) {
        dateStr = `${diffMins}m ago`;
      } else if (diffHours < 24) {
        dateStr = `${diffHours}h ago`;
      } else if (diffDays < 7) {
        dateStr = `${diffDays}d ago`;
      } else {
        dateStr = updatedDate.toLocaleDateString("en-US", { month: "short", day: "numeric" });
      }

      const fileCount = Object.keys(p.files).length;
      return {
        id: p.id,
        name: p.name,
        type: `${fileCount} file${fileCount !== 1 ? "s" : ""}`,
        date: dateStr,
        status: "Completed",
      };
    });

    const existingDashboard = this.db
      .prepare("SELECT profile_email, ai_generations FROM dashboards WHERE user_id = ?")
      .get(userId) as { profile_email: string; ai_generations: number } | undefined;

    const aiGenerations = existingDashboard?.ai_generations ?? 0;
    const email = existingDashboard?.profile_email || `${username}@synapse.local`;

    if (!existingDashboard) {
      this.db
        .prepare("INSERT INTO dashboards (user_id, profile_email, ai_generations) VALUES (?, ?, ?)")
        .run(userId, email, aiGenerations);
    }

    return {
      profile: {
        name: username,
        email,
      },
      stats: {
        totalProjects,
        aiGenerations,
      },
      history,
    };
  }

  async getChatMessages(userId: string): Promise<ChatMessageData[]> {
    const rows = this.db
      .prepare(
        `SELECT id, role, content, timestamp, model
         FROM chats
         WHERE user_id = ?
         ORDER BY seq ASC`,
      )
      .all(userId) as ChatRow[];

    return rows.map((row) => ({
      id: row.id,
      role: row.role,
      content: row.content,
      timestamp: row.timestamp,
      model: row.model || undefined,
    }));
  }

  async appendChatMessage(userId: string, message: ChatMessageData): Promise<void> {
    this.db
      .prepare(
        `INSERT INTO chats (user_id, id, role, content, timestamp, model)
         VALUES (?, ?, ?, ?, ?, ?)`,
      )
      .run(
        userId,
        message.id,
        message.role,
        message.content,
        message.timestamp,
        message.model || null,
      );

    this.db
      .prepare(
        `DELETE FROM chats
         WHERE seq IN (
           SELECT seq FROM chats WHERE user_id = ? ORDER BY seq DESC LIMIT -1 OFFSET 200
         )`,
      )
      .run(userId);
  }

  async clearChatMessages(userId: string): Promise<void> {
    this.db.prepare("DELETE FROM chats WHERE user_id = ?").run(userId);
  }

  async incrementAIGenerationCount(userId: string, username: string): Promise<void> {
    const existing = this.db
      .prepare("SELECT ai_generations, profile_email FROM dashboards WHERE user_id = ?")
      .get(userId) as { ai_generations: number; profile_email: string } | undefined;

    if (!existing) {
      this.db
        .prepare("INSERT INTO dashboards (user_id, profile_email, ai_generations) VALUES (?, ?, 1)")
        .run(userId, `${username}@synapse.local`);
      return;
    }

    this.db
      .prepare("UPDATE dashboards SET ai_generations = ? WHERE user_id = ?")
      .run((existing.ai_generations || 0) + 1, userId);
  }

  async createProject(
    userId: string,
    name: string,
    files: Record<string, ProjectFile>,
  ): Promise<ProjectData> {
    const now = new Date().toISOString();
    const id = randomUUID();

    this.db
      .prepare(
        `INSERT INTO projects (id, user_id, name, files_json, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?)`,
      )
      .run(id, userId, name, JSON.stringify(files), now, now);

    return {
      id,
      userId,
      name,
      files,
      createdAt: now,
      updatedAt: now,
    };
  }

  async getProjectsByUser(userId: string): Promise<ProjectData[]> {
    const rows = this.db
      .prepare(
        `SELECT id, user_id, name, files_json, created_at, updated_at
         FROM projects
         WHERE user_id = ?
         ORDER BY updated_at DESC`,
      )
      .all(userId) as ProjectRow[];

    return rows.map((row) => this.toProjectData(row));
  }

  async getProject(projectId: string): Promise<ProjectData | undefined> {
    const row = this.db
      .prepare(
        `SELECT id, user_id, name, files_json, created_at, updated_at
         FROM projects
         WHERE id = ?`,
      )
      .get(projectId) as ProjectRow | undefined;

    return row ? this.toProjectData(row) : undefined;
  }

  async updateProjectFiles(
    projectId: string,
    files: Record<string, ProjectFile>,
  ): Promise<ProjectData | undefined> {
    const existing = await this.getProject(projectId);
    if (!existing) {
      return undefined;
    }

    const updatedAt = new Date().toISOString();
    this.db
      .prepare("UPDATE projects SET files_json = ?, updated_at = ? WHERE id = ?")
      .run(JSON.stringify(files), updatedAt, projectId);

    return {
      ...existing,
      files,
      updatedAt,
    };
  }

  async deleteProject(projectId: string): Promise<boolean> {
    const result = this.db.prepare("DELETE FROM projects WHERE id = ?").run(projectId);
    return result.changes > 0;
  }

  async renameProject(projectId: string, name: string): Promise<ProjectData | undefined> {
    const existing = await this.getProject(projectId);
    if (!existing) {
      return undefined;
    }

    const updatedAt = new Date().toISOString();
    this.db
      .prepare("UPDATE projects SET name = ?, updated_at = ? WHERE id = ?")
      .run(name, updatedAt, projectId);

    return {
      ...existing,
      name,
      updatedAt,
    };
  }

  async getProjectInsights(userId: string, projectId: string): Promise<ProjectInsightData | undefined> {
    const row = this.db
      .prepare(
        `SELECT user_id, project_id, insights_json, created_at
         FROM project_insights
         WHERE user_id = ? AND project_id = ?`,
      )
      .get(userId, projectId) as InsightRow | undefined;

    if (!row) {
      return undefined;
    }

    return {
      userId: row.user_id,
      projectId: row.project_id,
      insights: this.parseInsights(row.insights_json),
      createdAt: row.created_at,
    };
  }

  async upsertProjectInsights(userId: string, projectId: string, insights: string[]): Promise<ProjectInsightData> {
    const now = new Date().toISOString();
    const sanitized = insights.filter((item) => item.trim().length > 0).slice(0, 12);

    this.db
      .prepare(
        `INSERT INTO project_insights (user_id, project_id, insights_json, created_at)
         VALUES (?, ?, ?, ?)
         ON CONFLICT(user_id, project_id)
         DO UPDATE SET insights_json = excluded.insights_json, created_at = excluded.created_at`,
      )
      .run(userId, projectId, JSON.stringify(sanitized), now);

    return {
      userId,
      projectId,
      insights: sanitized,
      createdAt: now,
    };
  }

  async shouldRefreshProjectInsights(userId: string, projectId: string, maxAgeHours: number): Promise<boolean> {
    const existing = await this.getProjectInsights(userId, projectId);
    if (!existing) {
      return true;
    }

    const createdAtMs = new Date(existing.createdAt).getTime();
    if (Number.isNaN(createdAtMs)) {
      return true;
    }

    const maxAgeMs = Math.max(1, maxAgeHours) * 60 * 60 * 1000;
    return Date.now() - createdAtMs > maxAgeMs;
  }

  async getProjectChatwootIntegration(userId: string, projectId: string): Promise<ChatwootIntegrationData | undefined> {
    const row = this.db
      .prepare(
        `SELECT user_id, project_id, website_token, chatwoot_url, created_at, updated_at
         FROM project_integrations
         WHERE user_id = ? AND project_id = ?`,
      )
      .get(userId, projectId) as IntegrationRow | undefined;

    if (!row) {
      return undefined;
    }

    return {
      userId: row.user_id,
      projectId: row.project_id,
      websiteToken: row.website_token,
      chatwootUrl: row.chatwoot_url,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  async upsertProjectChatwootIntegration(
    userId: string,
    projectId: string,
    websiteToken: string,
    chatwootUrl: string,
  ): Promise<ChatwootIntegrationData> {
    const existing = await this.getProjectChatwootIntegration(userId, projectId);
    const now = new Date().toISOString();

    const entry: ChatwootIntegrationData = {
      userId,
      projectId,
      websiteToken: websiteToken.trim(),
      chatwootUrl: chatwootUrl.trim().replace(/\/+$/, ""),
      createdAt: existing?.createdAt || now,
      updatedAt: now,
    };

    this.db
      .prepare(
        `INSERT INTO project_integrations (user_id, project_id, website_token, chatwoot_url, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?)
         ON CONFLICT(user_id, project_id)
         DO UPDATE SET
           website_token = excluded.website_token,
           chatwoot_url = excluded.chatwoot_url,
           updated_at = excluded.updated_at`,
      )
      .run(
        entry.userId,
        entry.projectId,
        entry.websiteToken,
        entry.chatwootUrl,
        entry.createdAt,
        entry.updatedAt,
      );

    return entry;
  }
}

export const storage = new FileStorage();
