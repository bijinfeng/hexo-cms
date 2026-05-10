import type { RegisteredDashboardWidget } from "@hexo-cms/core";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { AttachmentsSummaryWidget } from "./renderers/attachments-summary-widget";

interface DashboardExtensionOutletProps {
  widgets: RegisteredDashboardWidget[];
}

export function DashboardExtensionOutlet({ widgets }: DashboardExtensionOutletProps) {
  return widgets.map((widget) => ({
    id: `${widget.pluginId}:${widget.id}`,
    title: widget.title,
    content: <DashboardWidgetFrame key={`${widget.pluginId}:${widget.id}`} widget={widget} />,
  }));
}

function DashboardWidgetFrame({ widget }: { widget: RegisteredDashboardWidget }) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle>{widget.title}</CardTitle>
      </CardHeader>
      <CardContent>
        <PluginRenderer widget={widget} />
      </CardContent>
    </Card>
  );
}

function PluginRenderer({ widget }: { widget: RegisteredDashboardWidget }) {
  switch (widget.renderer) {
    case "builtin.attachments.summary":
      return <AttachmentsSummaryWidget />;
    default:
      return (
        <div className="rounded-lg border border-[var(--status-warning)] bg-[var(--status-warning-bg)] p-3 text-sm text-[var(--status-warning)]">
          未找到插件渲染器: {widget.renderer}
        </div>
      );
  }
}
