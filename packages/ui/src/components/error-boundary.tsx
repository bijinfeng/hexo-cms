import { Component } from "react";
import type { ErrorInfo, ReactNode } from "react";

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
      return <DefaultFallback error={this.state.error!} onRetry={() => this.setState({ hasError: false, error: null })} />;
    }
    return this.props.children;
  }
}

function DefaultFallback({ error, onRetry }: { error: Error; onRetry: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[400px] p-8 text-center">
      <div className="w-16 h-16 rounded-full bg-error/10 flex items-center justify-center mb-4">
        <span className="text-2xl text-error">!</span>
      </div>
      <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-2">
        出错了
      </h2>
      <p className="text-sm text-gray-500 dark:text-gray-400 mb-6 max-w-md">
        页面遇到了一个意外错误。你的数据是安全的。
      </p>
      {error && (
        <details className="mb-6 max-w-md">
          <summary className="text-xs text-gray-400 cursor-pointer hover:text-gray-600 dark:hover:text-gray-300">
            错误详情
          </summary>
          <pre className="mt-2 p-3 bg-gray-100 dark:bg-gray-800 rounded text-xs text-left overflow-auto max-h-32 text-gray-600 dark:text-gray-400">
            {error.message}
          </pre>
        </details>
      )}
      <button
        onClick={onRetry}
        className="px-4 py-2 bg-primary-500 text-white rounded-md hover:bg-primary-600 transition-colors text-sm font-medium"
      >
        重试
      </button>
    </div>
  );
}
