import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { LoginPage } from "@hexo-cms/ui";
import { signIn } from "../lib/auth-client";

function WebLoginPage() {
  const navigate = useNavigate();
  return (
    <LoginPage
      signIn={signIn}
      onSkipAuth={() => navigate({ to: "/" })}
    />
  );
}

export const Route = createFileRoute("/login")({ component: WebLoginPage });
