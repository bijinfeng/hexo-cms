import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { LoginPage } from "@hexo-cms/ui";

function DesktopLoginPage() {
  const navigate = useNavigate();
  return (
    <LoginPage
      onSkipAuth={() => navigate({ to: "/" })}
    />
  );
}

export const Route = createFileRoute("/login")({
  component: DesktopLoginPage,
});
