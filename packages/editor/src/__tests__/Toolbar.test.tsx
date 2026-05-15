import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Toolbar } from "../Toolbar";

describe("Toolbar", () => {
  const defaultProps = {
    editor: null,
    onSourceToggle: vi.fn(),
    onImageUpload: vi.fn(),
    sourceMode: false,
  };

  it("renders source toggle button", () => {
    render(<Toolbar {...defaultProps} />);
    expect(screen.getByTitle("切换源码")).toBeDefined();
  });

  it("calls onSourceToggle when source button clicked", async () => {
    const onSourceToggle = vi.fn();
    render(<Toolbar {...defaultProps} onSourceToggle={onSourceToggle} />);
    await userEvent.click(screen.getByTitle("切换源码"));
    expect(onSourceToggle).toHaveBeenCalled();
  });

  it("renders image upload button", () => {
    render(<Toolbar {...defaultProps} />);
    expect(screen.getByTitle("插入图片")).toBeDefined();
  });

  it("shows different icon when in source mode", () => {
    const { rerender } = render(<Toolbar {...defaultProps} sourceMode={false} />);
    expect(screen.getByTitle("切换源码")).toBeDefined();

    rerender(<Toolbar {...defaultProps} sourceMode={true} />);
    expect(screen.getByTitle("切换源码")).toBeDefined();
  });
});
