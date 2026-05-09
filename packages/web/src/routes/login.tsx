import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { LoginPage } from "@hexo-cms/ui";
import { webAuthClient } from "../lib/auth-client";

function WebLoginPage() {
  const navigate = useNavigate();
  return (
    <LoginPage
      authClient={webAuthClient}
      onComplete={() => navigate({ to: "/" })}
    />
  );
}

export const Route = createFileRoute("/login")({ component: WebLoginPage });
