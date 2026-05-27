import type { RegisteredPluginPage } from "@hexo-cms/core";
import { usePluginSystem } from "@hexo-cms/ui";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/plugins/$pluginId/$pageId")({
  component: PluginPageRoute,
});

function PluginPageRoute() {
  const { pluginId, pageId } = Route.useParams();
  const { snapshot, getPluginPageRenderer } = usePluginSystem();

  const page: RegisteredPluginPage | undefined = snapshot.extensions.pages.find(
    (p) => p.pluginId === pluginId && p.route === pageId,
  );

  if (!page) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center space-y-2">
          <h2 className="text-lg font-semibold text-[var(--text-primary)]">Page not found</h2>
          <p className="text-sm text-[var(--text-secondary)]">
            The plugin page &quot;{pageId}&quot; is not registered by &quot;{pluginId}&quot;.
          </p>
        </div>
      </div>
    );
  }

  const Renderer = getPluginPageRenderer(page);

  if (!Renderer) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center space-y-2">
          <h2 className="text-lg font-semibold text-[var(--text-primary)]">Page unavailable</h2>
          <p className="text-sm text-[var(--text-secondary)]">
            The renderer for this page is not available.
          </p>
        </div>
      </div>
    );
  }

  return <Renderer />;
}
