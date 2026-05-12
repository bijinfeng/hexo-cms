import type { ComponentType } from "react";
import type { PluginConfigValue, RegisteredDashboardWidget } from "@hexo-cms/core";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { PluginErrorBoundary } from "./plugin-error-boundary";
import { AttachmentsSummaryWidget } from "./renderers/attachments-summary-widget";
import { CommentsOverviewWidget } from "./renderers/comments-overview-widget";
import { DraftCoachWidget } from "./draft-coach/widget";

type DashboardWidgetRenderer = ComponentType<{ config?: PluginConfigValue }>;
type DashboardWidgetRenderers = Record<string, DashboardWidgetRenderer>;

interface DashboardExtensionOutletProps {
  widgets: RegisteredDashboardWidget[];
  configs?: Record<string, PluginConfigValue>;
  renderers?: DashboardWidgetRenderers;
}

const defaultDashboardWidgetRenderers: DashboardWidgetRenderers = {
  "builtin.attachments.summary": AttachmentsSummaryWidget,
  "builtin.comments.overview": CommentsOverviewWidget,
  "builtin.draft.overview": DraftCoachWidget,
};

export function DashboardExtensionOutlet({ widgets, configs, renderers }: DashboardExtensionOutletProps) {
  const resolvedRenderers = {
    ...defaultDashboardWidgetRenderers,
    ...renderers,
  };

  return widgets.map((widget) => ({
    id: `${widget.pluginId}:${widget.id}`,
    title: widget.title,
    content: (
      <DashboardWidgetFrame
        key={`${widget.pluginId}:${widget.id}`}
        widget={widget}
        config={configs?.[widget.pluginId]}
        renderers={resolvedRenderers}
      />
    ),
  }));
}

function DashboardWidgetFrame({
  widget,
  config,
  renderers,
}: {
  widget: RegisteredDashboardWidget;
  config?: PluginConfigValue;
  renderers: DashboardWidgetRenderers;
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
          <PluginRenderer widget={widget} config={config} renderers={renderers} />
        </PluginErrorBoundary>
      </CardContent>
    </Card>
  );
}

function PluginRenderer({
  widget,
  config,
  renderers,
}: {
  widget: RegisteredDashboardWidget;
  config?: PluginConfigValue;
  renderers: DashboardWidgetRenderers;
}) {
  const Renderer = renderers[widget.renderer];
  if (Renderer) return <Renderer config={config} />;

  return (
    <div className="rounded-lg border border-[var(--status-warning)] bg-[var(--status-warning-bg)] p-3 text-sm text-[var(--status-warning)]">
      未找到插件渲染器: {widget.renderer}
    </div>
  );
}
