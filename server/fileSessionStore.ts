import session from "express-session";
import { mkdir, readFile, writeFile } from "fs/promises";
import path from "path";

type SessionRecord = {
  session: session.SessionData;
  expiresAt: number | null;
};

type PersistedSessionData = {
  sessions: Array<{
    sid: string;
    session: session.SessionData;
    expiresAt: number | null;
  }>;
};

export class FileSessionStore extends session.Store {
  private sessions = new Map<string, SessionRecord>();
  private readonly filePath: string;
  private readonly loadPromise: Promise<void>;
  private writeQueue: Promise<void> = Promise.resolve();

  constructor(filePath = path.resolve(process.cwd(), "data", "sessions.json")) {
    super();
    this.filePath = filePath;
    this.loadPromise = this.loadFromDisk();
  }

  private getExpiresAt(sess: session.SessionData): number | null {
    const expires = sess.cookie?.expires;
    if (!expires) {
      return null;
    }

    const timestamp = new Date(expires).getTime();
    return Number.isFinite(timestamp) ? timestamp : null;
  }

  private isExpired(record: SessionRecord): boolean {
    return record.expiresAt !== null && record.expiresAt <= Date.now();
  }

  private pruneExpired(): void {
    this.sessions.forEach((record, sid) => {
      if (this.isExpired(record)) {
        this.sessions.delete(sid);
      }
    });
  }

  private async loadFromDisk(): Promise<void> {
    const dataDir = path.dirname(this.filePath);
    await mkdir(dataDir, { recursive: true });

    try {
      const raw = await readFile(this.filePath, "utf-8");
      const parsed = JSON.parse(raw) as Partial<PersistedSessionData>;
      const entries = Array.isArray(parsed.sessions) ? parsed.sessions : [];
      this.sessions = new Map(
        entries.map((entry) => [
          entry.sid,
          {
            session: entry.session,
            expiresAt: entry.expiresAt,
          },
        ]),
      );

      this.pruneExpired();
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") {
        await this.persistToDisk();
        return;
      }

      throw new Error(
        `Failed to initialize file session store: ${(error as Error).message}`,
      );
    }
  }

  private async persistToDisk(): Promise<void> {
    this.pruneExpired();

    const payload: PersistedSessionData = {
      sessions: Array.from(this.sessions.entries()).map(([sid, record]) => ({
        sid,
        session: record.session,
        expiresAt: record.expiresAt,
      })),
    };

    const serialized = JSON.stringify(payload, null, 2);
    this.writeQueue = this.writeQueue.then(() =>
      writeFile(this.filePath, serialized, "utf-8"),
    );
    await this.writeQueue;
  }

  private async ensureLoaded(): Promise<void> {
    await this.loadPromise;
  }

  override get(
    sid: string,
    callback: (err: unknown, sessionData?: session.SessionData | null) => void,
  ): void {
    void (async () => {
      try {
        await this.ensureLoaded();
        const record = this.sessions.get(sid);

        if (!record) {
          callback(null, null);
          return;
        }

        if (this.isExpired(record)) {
          this.sessions.delete(sid);
          await this.persistToDisk();
          callback(null, null);
          return;
        }

        callback(null, record.session);
      } catch (error) {
        callback(error);
      }
    })();
  }

  override set(
    sid: string,
    sessionData: session.SessionData,
    callback?: (err?: unknown) => void,
  ): void {
    void (async () => {
      try {
        await this.ensureLoaded();
        this.sessions.set(sid, {
          session: sessionData,
          expiresAt: this.getExpiresAt(sessionData),
        });
        await this.persistToDisk();
        callback?.();
      } catch (error) {
        callback?.(error);
      }
    })();
  }

  override destroy(sid: string, callback?: (err?: unknown) => void): void {
    void (async () => {
      try {
        await this.ensureLoaded();
        this.sessions.delete(sid);
        await this.persistToDisk();
        callback?.();
      } catch (error) {
        callback?.(error);
      }
    })();
  }

  override touch(
    sid: string,
    sessionData: session.SessionData,
    callback?: () => void,
  ): void {
    void (async () => {
      await this.ensureLoaded();
      const record = this.sessions.get(sid);
      if (!record) {
        callback?.();
        return;
      }

      this.sessions.set(sid, {
        session: sessionData,
        expiresAt: this.getExpiresAt(sessionData),
      });
      await this.persistToDisk();
      callback?.();
    })();
  }
}