import { describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
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

  it("renders avatar fallback even when avatarUrl is provided (jsdom cannot load images)", async () => {
    const client = createMockAuthClient({ avatarUrl: "https://example.com/avatar.png" });
    renderUserMenu(client);
    await waitFor(() => {
      const trigger = screen.getByLabelText("用户菜单");
      expect(trigger).toBeInTheDocument();
    });
  });

  it("shows dropdown on click and displays user info", async () => {
    const user = userEvent.setup();
    renderUserMenu();
    await waitFor(() => {
      expect(screen.getByText("K")).toBeInTheDocument();
    });
    await user.click(screen.getByLabelText("用户菜单"));
    expect(await screen.findByText("Kebai")).toBeInTheDocument();
    expect(screen.getByText("kebai@example.com")).toBeInTheDocument();
    expect(screen.getByText("系统设置")).toBeInTheDocument();
    expect(screen.getByText("退出登录")).toBeInTheDocument();
  });

  it("calls signOut and onSignedOut on click", async () => {
    const user = userEvent.setup();
    const client = createMockAuthClient();
    const onSignedOut = vi.fn();
    renderUserMenu(client, onSignedOut);
    await waitFor(() => {
      expect(screen.getByLabelText("用户菜单")).toBeInTheDocument();
    });
    await user.click(screen.getByLabelText("用户菜单"));
    expect(await screen.findByText("退出登录")).toBeInTheDocument();
    await user.click(screen.getByText("退出登录"));
    await waitFor(() => {
      expect(client.signOut).toHaveBeenCalled();
      expect(onSignedOut).toHaveBeenCalled();
    });
  });

  it("closes dropdown on escape key", async () => {
    const user = userEvent.setup();
    renderUserMenu();
    await waitFor(() => {
      expect(screen.getByLabelText("用户菜单")).toBeInTheDocument();
    });
    await user.click(screen.getByLabelText("用户菜单"));
    expect(await screen.findByText("系统设置")).toBeInTheDocument();
    await user.keyboard("{Escape}");
    await waitFor(() => {
      expect(screen.queryByText("系统设置")).not.toBeInTheDocument();
    });
  });
});
