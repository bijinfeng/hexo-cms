import { describe, expect, it, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { UserMenu } from "../components/user-menu";
import type { AuthClient, AuthSession } from "../types/auth";

vi.mock("@tanstack/react-router", () => ({
  useNavigate: () => vi.fn(),
  Link: ({ children, to }: { children: React.ReactNode; to: string }) => (
    <a href={to}>{children}</a>
  ),
}));

function createMockAuthClient(userOverrides?: Partial<NonNullable<AuthSession["user"]>>): AuthClient {
  return {
    getSession: vi.fn().mockResolvedValue({
      state: "authenticated" as const,
      user: {
        id: "1",
        name: "Kebai",
        email: "kebai@example.com",
        login: "kebai",
        avatarUrl: null,
        ...userOverrides,
      },
    }),
    startLogin: vi.fn(),
    signOut: vi.fn().mockResolvedValue(undefined),
    reauthorize: vi.fn(),
  };
}

function renderUserMenu(authClient?: AuthClient, onSignedOut = vi.fn()) {
  return render(
    <UserMenu authClient={authClient ?? createMockAuthClient()} onSignedOut={onSignedOut} />
  );
}

describe("UserMenu", () => {
  it("renders avatar with initial when no avatarUrl", async () => {
    renderUserMenu();
    await waitFor(() => {
      expect(screen.getByText("K")).toBeInTheDocument();
    });
  });

  it("renders avatar image when avatarUrl is available", async () => {
    const client = createMockAuthClient({ avatarUrl: "https://example.com/avatar.png" });
    renderUserMenu(client);
    await waitFor(() => {
      const img = screen.getByAltText("Kebai");
      expect(img).toBeInTheDocument();
      expect(img).toHaveAttribute("src", "https://example.com/avatar.png");
    });
  });

  it("shows dropdown on click and displays user info", async () => {
    renderUserMenu();
    await waitFor(() => {
      expect(screen.getByText("K")).toBeInTheDocument();
    });
    fireEvent.click(screen.getByLabelText("用户菜单"));
    expect(screen.getByText("Kebai")).toBeInTheDocument();
    expect(screen.getByText("kebai@example.com")).toBeInTheDocument();
    expect(screen.getByText("系统设置")).toBeInTheDocument();
    expect(screen.getByText("退出登录")).toBeInTheDocument();
  });

  it("calls signOut and onSignedOut on click", async () => {
    const client = createMockAuthClient();
    const onSignedOut = vi.fn();
    renderUserMenu(client, onSignedOut);
    await waitFor(() => {
      expect(screen.getByLabelText("用户菜单")).toBeInTheDocument();
    });
    fireEvent.click(screen.getByLabelText("用户菜单"));
    fireEvent.click(screen.getByText("退出登录"));
    await waitFor(() => {
      expect(client.signOut).toHaveBeenCalled();
      expect(onSignedOut).toHaveBeenCalled();
    });
  });

  it("closes dropdown on outside click", async () => {
    renderUserMenu();
    await waitFor(() => {
      expect(screen.getByLabelText("用户菜单")).toBeInTheDocument();
    });
    fireEvent.click(screen.getByLabelText("用户菜单"));
    expect(screen.getByText("系统设置")).toBeInTheDocument();
    const backdrop = document.querySelector(".fixed.inset-0.z-40") as HTMLElement;
    fireEvent.click(backdrop);
    await waitFor(() => {
      expect(screen.queryByText("系统设置")).not.toBeInTheDocument();
    });
  });
});
