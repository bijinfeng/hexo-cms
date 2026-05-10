import type { PluginConfigValue, RegisteredDashboardWidget } from "@hexo-cms/core";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { AttachmentsSummaryWidget } from "./renderers/attachments-summary-widget";
import { CommentsOverviewWidget } from "./renderers/comments-overview-widget";

interface DashboardExtensionOutletProps {
  widgets: RegisteredDashboardWidget[];
  configs?: Record<string, PluginConfigValue>;
}

export function DashboardExtensionOutlet({ widgets, configs }: DashboardExtensionOutletProps) {
  return widgets.map((widget) => ({
    id: `${widget.pluginId}:${widget.id}`,
    title: widget.title,
    content: (
      <DashboardWidgetFrame
        key={`${widget.pluginId}:${widget.id}`}
        widget={widget}
        config={configs?.[widget.pluginId]}
      />
    ),
  }));
}

function DashboardWidgetFrame({
  widget,
  config,
}: {
  widget: RegisteredDashboardWidget;
  config?: PluginConfigValue;
}) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle>{widget.title}</CardTitle>
      </CardHeader>
      <CardContent>
        <PluginRenderer widget={widget} config={config} />
      </CardContent>
    </Card>
  );
}

function PluginRenderer({
  widget,
  config,
}: {
  widget: RegisteredDashboardWidget;
  config?: PluginConfigValue;
}) {
  switch (widget.renderer) {
    case "builtin.attachments.summary":
      return <AttachmentsSummaryWidget />;
    case "builtin.comments.overview":
      return <CommentsOverviewWidget config={config} />;
    default:
      return (
        <div className="rounded-lg border border-[var(--status-warning)] bg-[var(--status-warning-bg)] p-3 text-sm text-[var(--status-warning)]">
          未找到插件渲染器: {widget.renderer}
        </div>
      );
  }
}
