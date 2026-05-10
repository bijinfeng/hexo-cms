import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { Topbar } from "../components/layout/Topbar";

describe("Topbar", () => {
  it("renders global search by default", () => {
    render(<Topbar title="媒体库" />);

    expect(screen.getByText("搜索...")).toBeInTheDocument();
  });

  it("hides global search when disabled by layout policy", () => {
    render(<Topbar title="媒体库" showSearch={false} />);

    expect(screen.queryByText("搜索...")).not.toBeInTheDocument();
  });
});
