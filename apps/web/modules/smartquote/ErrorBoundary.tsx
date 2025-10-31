import React, { Component, ErrorInfo, ReactNode } from "react";

interface Props {
  children?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false
  };

  public static getDerivedStateFromError(error: Error): State {
    // Update state so the next render will show the fallback UI.
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught error:", error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
            <div className="bg-white rounded-lg shadow-xl p-8 max-w-lg text-center border border-red-200">
                <h1 className="text-2xl font-bold text-red-700">Something went wrong.</h1>
                <p className="mt-2 text-gray-600">
                    A critical error occurred in the application. Please try refreshing the page.
                    If the problem persists, please contact support.
                </p>
                <button
                    onClick={() => window.location.reload()}
                    className="mt-6 inline-flex items-center px-6 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                    Refresh Page
                </button>
                 {this.state.error && (
                    <details className="mt-4 text-left text-xs text-gray-500">
                        <summary className="cursor-pointer">Error Details</summary>
                        <pre className="mt-2 p-2 bg-gray-50 rounded-md overflow-auto">
                            {this.state.error.toString()}
                        </pre>
                    </details>
                )}
            </div>
        </div>
      );
    }

    return this.props.children;
  }
}
