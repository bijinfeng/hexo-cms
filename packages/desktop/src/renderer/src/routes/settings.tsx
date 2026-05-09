import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { SettingsPage } from "@hexo-cms/ui";
import { desktopAuthClient } from "../lib/desktop-auth-client";

function DesktopSettingsPage() {
  const navigate = useNavigate();
  return (
    <SettingsPage
      authClient={desktopAuthClient}
      onSignedOut={() => navigate({ to: "/login", replace: true })}
    />
  );
}

export const Route = createFileRoute("/settings")({
  component: DesktopSettingsPage,
});
