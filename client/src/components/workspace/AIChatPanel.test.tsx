// @vitest-environment jsdom

import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import AIChatPanel from "./AIChatPanel";

vi.mock("localforage", () => ({
  default: {
    getItem: vi.fn(async () => null),
    setItem: vi.fn(async () => undefined),
    removeItem: vi.fn(async () => undefined),
  },
}));

describe("AIChatPanel", () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    const sseBody = [
      `data: ${JSON.stringify({ token: "Mock assistant response" })}\n\n`,
      `data: ${JSON.stringify({
        done: true,
        message: {
          id: "assistant-1",
          role: "assistant",
          content: "Mock assistant response",
          timestamp: "1:00 PM",
        },
        editorChanges: [],
      })}\n\n`,
    ].join("");

    global.fetch = vi.fn(async (input) => {
      const url = typeof input === "string" ? input : input.toString();
      if (url.includes("/api/chat/suggest")) {
        return new Response(JSON.stringify({ suggestions: [] }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      }

      return new Response(sseBody, {
        status: 200,
        headers: { "Content-Type": "text/event-stream" },
      });
    }) as typeof fetch;
  });

  afterEach(() => {
    global.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  it("renders, accepts input, and shows mocked assistant response", async () => {
    render(
      <AIChatPanel
        onApplyToEditor={() => undefined}
        getFileContent={() => ""}
        activeFilePath="src/App.tsx"
        activeFileContent=""
        otherFileSummaries={[]}
      />,
    );

    const textarea = screen.getByPlaceholderText("Ask Synapse AI anything...");
    fireEvent.change(textarea, { target: { value: "Hello AI" } });
    fireEvent.keyDown(textarea, { key: "Enter", ctrlKey: true });

    await waitFor(() => {
      expect(screen.getByText("Mock assistant response")).toBeInTheDocument();
    });

    expect(global.fetch).toHaveBeenCalled();
  });
});
