import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import { BubbleMenu } from "../BubbleMenu";

describe("BubbleMenu", () => {
  it("renders without crashing when editor is null", () => {
    const { container } = render(<BubbleMenu editor={null} />);
    expect(container).toBeDefined();
  });

  it("exports BubbleMenu component", () => {
    expect(BubbleMenu).toBeDefined();
    expect(typeof BubbleMenu).toBe("function");
  });
});
