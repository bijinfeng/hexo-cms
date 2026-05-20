import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
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
