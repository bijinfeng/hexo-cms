import { createFileRoute, useNavigate, useRouterState } from "@tanstack/react-router";
import { SettingsPage } from "@hexo-cms/ui/pages/settings";
import { desktopAuthClient } from "../lib/desktop-auth-client";

function DesktopSettingsPage() {
  const navigate = useNavigate();
  const routerState = useRouterState();
  const section = getSearchValue(routerState.location.search, "section");
  return (
    <SettingsPage
      authClient={desktopAuthClient}
      initialSection={section}
      onSignedOut={() => navigate({ to: "/login", replace: true })}
    />
  );
}

export const Route = createFileRoute("/settings")({
  component: DesktopSettingsPage,
});

function getSearchValue(search: unknown, key: string): string | undefined {
  if (typeof search === "string") {
    return new URLSearchParams(search).get(key) ?? undefined;
  }
  if (search && typeof search === "object") {
    const value = (search as Record<string, unknown>)[key];
    return typeof value === "string" ? value : undefined;
  }
  return undefined;
}
