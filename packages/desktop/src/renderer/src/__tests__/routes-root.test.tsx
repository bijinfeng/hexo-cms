import { act, type ComponentType, type ReactElement, type ReactNode } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { AuthSession } from "@hexo-cms/ui";

const navigateMock = vi.fn();
let pathname = "/";
let mountedRoot: Root | null = null;

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

vi.mock("@tanstack/react-router", () => ({
  createRootRoute: (options: { component: ComponentType }) => ({ options }),
  Outlet: () => <div data-testid="outlet" />,
  useNavigate: () => navigateMock,
  useRouterState: () => ({ location: { pathname } }),
}));

vi.mock("@hexo-cms/ui", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@hexo-cms/ui")>();
  const passthrough = ({ children }: { children: ReactNode }) => <>{children}</>;

  return {
    ...actual,
    CMSLayout: passthrough,
    DataProviderProvider: passthrough,
    ErrorBoundary: passthrough,
    PluginProvider: passthrough,
  };
});

const authState = vi.hoisted(() => ({
  session: { state: "authenticated" } as AuthSession,
}));

vi.mock("../lib/desktop-auth-client", () => ({
  desktopAuthClient: {
    getSession: vi.fn(() => Promise.resolve(authState.session)),
  },
  subscribeToDesktopAuthChanges: vi.fn(() => vi.fn()),
}));

const dataProviderState = vi.hoisted(() => ({
  config: null as unknown,
}));

vi.mock("../lib/desktop-data-provider-instance", () => ({
  desktopDataProvider: {
    getConfig: vi.fn(() => Promise.resolve(dataProviderState.config)),
  },
}));

async function renderElement(element: ReactElement) {
  const container = document.createElement("div");
  document.body.appendChild(container);
  mountedRoot = createRoot(container);

  await act(async () => {
    mountedRoot?.render(element);
  });
}

async function waitForAssertion(assertion: () => void) {
  let error: unknown;

  for (let attempt = 0; attempt < 20; attempt += 1) {
    try {
      assertion();
      return;
    } catch (nextError) {
      error = nextError;
      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 0));
      });
    }
  }

  throw error;
}

describe("desktop root route guard", () => {
  beforeEach(() => {
    navigateMock.mockReset();
    pathname = "/";
    authState.session = { state: "authenticated" };
    dataProviderState.config = null;
  });

  afterEach(() => {
    act(() => {
      mountedRoot?.unmount();
    });
    mountedRoot = null;
    document.body.innerHTML = "";
  });

  it("routes authenticated users without repository config to onboarding", async () => {
    const { Route } = await import("../routes/__root");
    const RootComponent = Route.options.component!;

    await renderElement(<RootComponent />);

    await waitForAssertion(() => {
      expect(navigateMock).toHaveBeenCalledWith({ to: "/onboarding", replace: true });
    });
  });
});
