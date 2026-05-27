import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ErrorBoundary } from "../components/error-boundary";

describe("ErrorBoundary", () => {
  it("renders fallback copy even when i18n is unavailable", () => {
    render(
      <ErrorBoundary fallback={undefined} onError={() => undefined}>
        <ThrowingChild />
      </ErrorBoundary>,
    );

    expect(screen.getByText("Something went wrong")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Retry" })).toBeInTheDocument();
  });
});

function ThrowingChild() {
  throw new Error("boom");
}
