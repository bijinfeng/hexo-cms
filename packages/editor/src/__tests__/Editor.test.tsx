import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Editor } from "../Editor";

vi.mock("@tiptap/react", async () => {
  const actual = await vi.importActual("@tiptap/react");
  return {
    ...actual,
    useEditor: vi.fn(() => null),
    EditorContent: ({ editor }: { editor: unknown }) =>
      editor ? <div data-testid="editor-content">Editor Content</div> : null,
    BubbleMenu: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  };
});

describe("Editor", () => {
  const defaultProps = {
    value: "# Hello\n\nWorld",
    onChange: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders without crashing", () => {
    const { container } = render(<Editor {...defaultProps} />);
    expect(container).toBeDefined();
  });

  it("renders toolbar", () => {
    render(<Editor {...defaultProps} />);
    expect(screen.getByTitle("切换源码")).toBeDefined();
  });

  it("renders in normal mode by default (not source mode)", () => {
    render(<Editor {...defaultProps} />);
    expect(screen.queryByRole("textbox")).toBeNull();
  });

  it("toggles to source mode", async () => {
    render(<Editor {...defaultProps} />);
    const sourceBtn = screen.getByTitle("切换源码");
    await userEvent.click(sourceBtn);
    await waitFor(() => {
      expect(screen.getByRole("textbox")).toBeDefined();
    });
  });
});
