import { createFileRoute } from "@tanstack/react-router";
import { DeployPage } from "@hexo-cms/ui/pages/deploy";
export const Route = createFileRoute("/deploy")({ component: DeployPage });
