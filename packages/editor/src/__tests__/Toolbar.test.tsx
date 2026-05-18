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

  it("renders all editor tools in the header toolbar", () => {
    render(<Toolbar {...defaultProps} />);

    [
      "粗体",
      "斜体",
      "删除线",
      "行内代码",
      "链接",
      "标题",
      "无序列表",
      "有序列表",
      "任务列表",
      "引用",
      "插入图片",
      "代码块",
      "插入表格",
      "分割线",
      "切换源码",
    ].forEach((title) => {
      expect(screen.getByTitle(title)).toBeDefined();
    });
  });

  it("disables editor tools in source mode except source toggle", () => {
    render(<Toolbar {...defaultProps} sourceMode />);

    [
      "粗体",
      "斜体",
      "删除线",
      "行内代码",
      "链接",
      "标题",
      "无序列表",
      "有序列表",
      "任务列表",
      "引用",
      "插入图片",
      "代码块",
      "插入表格",
      "分割线",
    ].forEach((title) => {
      expect((screen.getByTitle(title) as HTMLButtonElement).disabled).toBe(true);
    });
    expect((screen.getByTitle("切换源码") as HTMLButtonElement).disabled).toBe(false);
  });

  it("shows different icon when in source mode", () => {
    const { rerender } = render(<Toolbar {...defaultProps} sourceMode={false} />);
    expect(screen.getByTitle("切换源码")).toBeDefined();

    rerender(<Toolbar {...defaultProps} sourceMode={true} />);
    expect(screen.getByTitle("切换源码")).toBeDefined();
  });
});
