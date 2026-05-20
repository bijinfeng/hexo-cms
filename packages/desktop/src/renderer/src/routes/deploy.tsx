import { DeployPage } from "@hexo-cms/ui/pages/deploy";
import { createFileRoute } from "@tanstack/react-router";
export const Route = createFileRoute("/deploy")({ component: DeployPage });
