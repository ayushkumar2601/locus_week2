import express from "express";
import request from "supertest";
import { createServer } from "http";
import { describe, expect, it, vi } from "vitest";

vi.mock("./aiGateway", () => ({
  generateWithFailover: vi.fn(async () => ({
    text: "[]",
    provider: "openai",
    model: "gpt-4o-mini",
  })),
  generateWithFailoverStream: vi.fn(async () => ({
    provider: "openai",
    model: "gpt-4o-mini",
    stream: (async function* () {
      yield "Hello from mocked stream";
    })(),
  })),
}));

async function createTestApp() {
  const { registerRoutes } = await import("./routes");
  const app = express();
  const httpServer = createServer(app);

  app.use(
    express.json({
      verify: (req: express.Request & { rawBody?: unknown }, _res, buf) => {
        req.rawBody = buf;
      },
    }),
  );
  app.use(express.urlencoded({ extended: false }));

  await registerRoutes(httpServer, app);
  return app;
}

describe("server routes", () => {
  it("supports signup and signin", async () => {
    const app = await createTestApp();
    const username = `tester_${Date.now()}`;
    const password = "supersecret123";

    const signup = await request(app)
      .post("/api/auth/signup")
      .send({ username, password })
      .expect(201);

    expect(signup.body).toEqual(
      expect.objectContaining({
        token: expect.any(String),
        user: expect.objectContaining({ username }),
      }),
    );

    const signin = await request(app)
      .post("/api/auth/signin")
      .send({ username, password })
      .expect(200);

    expect(signin.body).toEqual(
      expect.objectContaining({
        token: expect.any(String),
        user: expect.objectContaining({ username }),
      }),
    );
  });

  it("handles project CRUD for an authenticated user", async () => {
    const app = await createTestApp();
    const username = `project_user_${Date.now()}`;
    const password = "supersecret123";

    const auth = await request(app)
      .post("/api/auth/signup")
      .send({ username, password })
      .expect(201);

    const token = auth.body.token as string;
    const authHeader = { Authorization: `Bearer ${token}` };

    const created = await request(app)
      .post("/api/projects")
      .set(authHeader)
      .send({ name: "My Test Project", template: "blank" })
      .expect(201);

    expect(created.body).toEqual(
      expect.objectContaining({
        id: expect.any(String),
        name: "My Test Project",
      }),
    );

    const projectId = created.body.id as string;

    await request(app)
      .get("/api/projects")
      .set(authHeader)
      .expect(200)
      .expect((res) => {
        expect(Array.isArray(res.body)).toBe(true);
        expect(res.body.some((p: { id: string }) => p.id === projectId)).toBe(true);
      });

    await request(app)
      .put(`/api/projects/${projectId}/files`)
      .set(authHeader)
      .send({
        files: {
          "index.html": {
            content: "<html><body>hello</body></html>",
            language: "html",
          },
        },
      })
      .expect(200)
      .expect((res) => {
        expect(res.body.files["index.html"].content).toContain("hello");
      });

    await request(app)
      .patch(`/api/projects/${projectId}`)
      .set(authHeader)
      .send({ name: "Renamed Project" })
      .expect(200)
      .expect((res) => {
        expect(res.body.name).toBe("Renamed Project");
      });

    await request(app)
      .delete(`/api/projects/${projectId}`)
      .set(authHeader)
      .expect(204);
  });

  it("streams chat response with expected SSE shape", async () => {
    const app = await createTestApp();
    const username = `chat_user_${Date.now()}`;
    const password = "supersecret123";

    const auth = await request(app)
      .post("/api/auth/signup")
      .send({ username, password })
      .expect(201);

    const token = auth.body.token as string;

    const chatResponse = await request(app)
      .post("/api/chat")
      .set({ Authorization: `Bearer ${token}` })
      .send({
        message: "Reply with hello",
        model: "gpt-4o",
        outputLanguage: "en",
      })
      .expect(200);

    expect(chatResponse.headers["content-type"]).toContain("text/event-stream");
    expect(chatResponse.text).toContain('data: {"token":"Hello from mocked stream"}');
    expect(chatResponse.text).toContain('"done":true');
    expect(chatResponse.text).toContain('"message":{');
  });
});
