import React from "react";

type PanelErrorBoundaryProps = {
  children: React.ReactNode;
};

type PanelErrorBoundaryState = {
  hasError: boolean;
};

export default class PanelErrorBoundary extends React.Component<PanelErrorBoundaryProps, PanelErrorBoundaryState> {
  state: PanelErrorBoundaryState = {
    hasError: false,
  };

  static getDerivedStateFromError(): PanelErrorBoundaryState {
    return {
      hasError: true,
    };
  }

  componentDidCatch(error: Error): void {
    console.error("Workspace panel crashed:", error);
  }

  render() {
    if (!this.state.hasError) {
      return this.props.children;
    }

    return (
      <div className="h-full w-full flex items-center justify-center bg-[hsl(240,10%,4%)] p-4">
        <button
          type="button"
          onClick={() => window.location.reload()}
          className="rounded-md border border-[hsl(240,5%,16%)] bg-[hsl(240,10%,8%)] px-3 py-2 text-xs text-foreground hover:bg-[hsl(240,10%,10%)]"
        >
          Panel crashed — reload
        </button>
      </div>
    );
  }
}
