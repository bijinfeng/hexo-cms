import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Editor } from "../Editor";

const tiptapState = vi.hoisted(() => ({
  editor: null as unknown,
}));

vi.mock("@tiptap/react", async () => {
  const actual = await vi.importActual("@tiptap/react");
  return {
    ...actual,
    useEditor: vi.fn(() => tiptapState.editor),
    EditorContent: ({ editor }: { editor: unknown }) =>
      editor ? <div data-testid="editor-content">Editor Content</div> : null,
    BubbleMenu: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  };
});

vi.mock("../BubbleMenu", () => ({
  BubbleMenu: () => <div data-testid="bubble-menu" />,
}));

describe("Editor", () => {
  const defaultProps = {
    value: "# Hello\n\nWorld",
    onChange: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    tiptapState.editor = null;
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

  it("wraps editor content in a scroll viewport", () => {
    tiptapState.editor = {
      isActive: vi.fn(() => false),
      getAttributes: vi.fn(() => ({})),
      chain: vi.fn(() => ({
        focus: vi.fn(() => ({
          toggleBold: vi.fn(() => ({ run: vi.fn() })),
          toggleItalic: vi.fn(() => ({ run: vi.fn() })),
          toggleStrike: vi.fn(() => ({ run: vi.fn() })),
          toggleCode: vi.fn(() => ({ run: vi.fn() })),
          extendMarkRange: vi.fn(() => ({
            unsetLink: vi.fn(() => ({ run: vi.fn() })),
            setLink: vi.fn(() => ({ run: vi.fn() })),
          })),
          toggleHeading: vi.fn(() => ({ run: vi.fn() })),
          toggleBulletList: vi.fn(() => ({ run: vi.fn() })),
          toggleOrderedList: vi.fn(() => ({ run: vi.fn() })),
          toggleTaskList: vi.fn(() => ({ run: vi.fn() })),
          toggleBlockquote: vi.fn(() => ({ run: vi.fn() })),
          insertTable: vi.fn(() => ({ run: vi.fn() })),
          toggleCodeBlock: vi.fn(() => ({ run: vi.fn() })),
          setHorizontalRule: vi.fn(() => ({ run: vi.fn() })),
          setImage: vi.fn(() => ({ run: vi.fn() })),
        })),
      })),
    };
    const { container } = render(<Editor {...defaultProps} />);

    const viewport = container.querySelector(".tiptap-editor-scroll");
    expect(viewport).toBeDefined();
    expect(viewport?.querySelector("[data-testid='editor-content']")).toBeDefined();
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
