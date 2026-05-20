import type { PluginConfigValue, RegisteredDashboardWidget } from "@hexo-cms/core";
import type { ComponentType } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { PluginErrorBoundary } from "./plugin-error-boundary";

type DashboardWidgetRenderer = ComponentType<{ config?: PluginConfigValue }>;

interface DashboardExtensionOutletProps {
  widgets: RegisteredDashboardWidget[];
  configs?: Record<string, PluginConfigValue>;
  getRenderer: (widget: RegisteredDashboardWidget) => DashboardWidgetRenderer | undefined;
}

export function DashboardExtensionOutlet({
  widgets,
  configs,
  getRenderer,
}: DashboardExtensionOutletProps) {
  return widgets.map((widget) => ({
    id: `${widget.pluginId}:${widget.id}`,
    title: widget.title,
    content: (
      <DashboardWidgetFrame
        key={`${widget.pluginId}:${widget.id}`}
        widget={widget}
        config={configs?.[widget.pluginId]}
        getRenderer={getRenderer}
      />
    ),
  }));
}

function DashboardWidgetFrame({
  widget,
  config,
  getRenderer,
}: {
  widget: RegisteredDashboardWidget;
  config?: PluginConfigValue;
  getRenderer: (widget: RegisteredDashboardWidget) => DashboardWidgetRenderer | undefined;
}) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle>{widget.title}</CardTitle>
      </CardHeader>
      <CardContent>
        <PluginErrorBoundary
          pluginId={widget.pluginId}
          contributionId={widget.id}
          contributionType="dashboard.widget"
        >
          <PluginRenderer widget={widget} config={config} getRenderer={getRenderer} />
        </PluginErrorBoundary>
      </CardContent>
    </Card>
  );
}

function PluginRenderer({
  widget,
  config,
  getRenderer,
}: {
  widget: RegisteredDashboardWidget;
  config?: PluginConfigValue;
  getRenderer: (widget: RegisteredDashboardWidget) => DashboardWidgetRenderer | undefined;
}) {
  const Renderer = getRenderer(widget);
  if (Renderer) return <Renderer config={config} />;

  return (
    <div className="rounded-lg border border-[var(--status-warning)] bg-[var(--status-warning-bg)] p-3 text-sm text-[var(--status-warning)]">
      Missing plugin renderer: {widget.renderer}
    </div>
  );
}
