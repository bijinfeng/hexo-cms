import { Component } from "react";
import type { ErrorInfo, ReactNode } from "react";
import { Alert, AlertDescription, AlertTitle } from "./ui/alert";
import { Button } from "./ui/button";
import { AlertCircle } from "lucide-react";

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    const log = { level: "error", message: "ErrorBoundary caught error", error: error.message, stack: error.stack, componentStack: errorInfo.componentStack };
    console.error(JSON.stringify(log));
    this.props.onError?.(error, errorInfo);
  }

  render(): ReactNode {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;
      return <DefaultFallback error={this.state.error ?? new Error("Unknown error")} onRetry={() => this.setState({ hasError: false, error: null })} />;
    }
    return this.props.children;
  }
}

function DefaultFallback({ error, onRetry }: { error: Error; onRetry: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[400px] p-8 text-center">
      <AlertCircle className="w-12 h-12 text-[var(--status-error)] mb-4" />
      <Alert variant="destructive" className="mb-6 max-w-md">
        <AlertTitle>出错了</AlertTitle>
        <AlertDescription>
          页面遇到了一个意外错误。你的数据是安全的。
        </AlertDescription>
        {error && (
          <details className="mt-3">
            <summary className="text-xs cursor-pointer hover:opacity-80">
              错误详情
            </summary>
            <pre className="mt-2 p-3 bg-[var(--bg-muted)] rounded text-xs text-left overflow-auto max-h-32">
              {error.message}
            </pre>
          </details>
        )}
      </Alert>
      <Button variant="outline" onClick={onRetry}>
        重试
      </Button>
    </div>
  );
}
