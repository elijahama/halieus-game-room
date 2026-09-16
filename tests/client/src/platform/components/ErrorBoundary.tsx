import {
  Component,
  type ErrorInfo,
  type ReactNode,
} from "react";

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  message: string;
}

export class ErrorBoundary extends Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  state: ErrorBoundaryState = {
    hasError: false,
    message: "",
  };

  static getDerivedStateFromError(
    error: Error,
  ): ErrorBoundaryState {
    return {
      hasError: true,
      message: error.message,
    };
  }

  componentDidCatch(
    error: Error,
    info: ErrorInfo,
  ): void {
    console.error(
      "Mega Board interface error",
      error,
      info,
    );
  }

  private reload = (): void => {
    window.location.reload();
  };

  render(): ReactNode {
    if (!this.state.hasError) {
      return this.props.children;
    }

    return (
      <main className="fatal-error" role="alert">
        <section className="fatal-error__card">
          <p className="fatal-error__eyebrow">
            Interface recovery
          </p>
          <h1>Something went wrong</h1>
          <p>
            Your room is saved. Reload the interface to
            reconnect to the current game.
          </p>
          {this.state.message && (
            <pre>{this.state.message}</pre>
          )}
          <button type="button" onClick={this.reload}>
            Reload game
          </button>
        </section>
      </main>
    );
  }
}
