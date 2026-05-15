import { Component, type ErrorInfo, type ReactNode } from "react";
import { AlertTriangle } from "lucide-react";
import type { PluginContributionType } from "@hexo-cms/core";
import { Alert } from "../components/ui/alert";
import { usePluginSystem } from "./plugin-provider";

interface PluginErrorBoundaryProps {
  pluginId: string;
  contributionId: string;
  contributionType: PluginContributionType;
  children: ReactNode;
  onError: (error: Error, errorInfo: ErrorInfo) => void;
}

interface PluginErrorBoundaryState {
  hasError: boolean;
}

class PluginErrorBoundaryInner extends Component<PluginErrorBoundaryProps, PluginErrorBoundaryState> {
  state: PluginErrorBoundaryState = {
    hasError: false,
  };

  static getDerivedStateFromError(): PluginErrorBoundaryState {
    return {
      hasError: true,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    this.props.onError(error, errorInfo);
  }

  componentDidUpdate(previousProps: PluginErrorBoundaryProps): void {
    if (
      this.state.hasError &&
      (previousProps.pluginId !== this.props.pluginId ||
        previousProps.contributionId !== this.props.contributionId ||
        previousProps.contributionType !== this.props.contributionType)
    ) {
      this.setState({ hasError: false });
    }
  }

  render() {
    if (this.state.hasError) {
      return (
        <Alert variant="destructive">
          <div className="flex items-center gap-2 font-medium">
            <AlertTriangle size={15} />
            插件渲染失败
          </div>
          <div className="mt-1 text-xs">可在设置中停用或重试。</div>
        </Alert>
      );
    }

    return this.props.children;
  }
}

export function PluginErrorBoundary({
  pluginId,
  contributionId,
  contributionType,
  children,
}: Omit<PluginErrorBoundaryProps, "onError">) {
  const { recordPluginError } = usePluginSystem();

  return (
    <PluginErrorBoundaryInner
      pluginId={pluginId}
      contributionId={contributionId}
      contributionType={contributionType}
      onError={(error, errorInfo) =>
        recordPluginError(pluginId, {
          contributionId,
          contributionType,
          message: error.message,
          stack: error.stack ?? errorInfo.componentStack ?? undefined,
        })
      }
    >
      {children}
    </PluginErrorBoundaryInner>
  );
}
