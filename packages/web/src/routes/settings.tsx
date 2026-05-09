import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { SettingsPage } from "@hexo-cms/ui";
import { webAuthClient } from "../lib/auth-client";

function WebSettingsPage() {
  const navigate = useNavigate();
  return (
    <SettingsPage
      authClient={webAuthClient}
      onSignedOut={() => navigate({ to: "/login", replace: true })}
    />
  );
}

export const Route = createFileRoute("/settings")({ component: WebSettingsPage });
