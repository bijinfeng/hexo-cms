import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { LoginPage } from "@hexo-cms/ui/pages/login";
import { desktopAuthClient } from "../lib/desktop-auth-client";

function DesktopLoginPage() {
  const navigate = useNavigate();
  return (
    <LoginPage
      authClient={desktopAuthClient}
      onComplete={() => navigate({ to: "/" })}
    />
  );
}

export const Route = createFileRoute("/login")({
  component: DesktopLoginPage,
});
