import React from "react";

/**
 * Without this, any uncaught error during render (e.g. a backend response
 * shape mismatch) unmounts the entire React tree and leaves a blank white
 * page with no explanation — which is exactly what happened before this
 * was added. This catches that and shows something actionable instead.
 */
export class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, info) {
    console.error("Savivah app crashed:", error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          fontFamily: "'Segoe UI', Arial, sans-serif", minHeight: "100vh", display: "flex",
          alignItems: "center", justifyContent: "center", padding: 20, background: "#FAF9F5",
        }}>
          <div style={{ maxWidth: 420, textAlign: "center" }}>
            <h1 style={{ fontSize: 20, fontWeight: 800, marginBottom: 8 }}>Something went wrong</h1>
            <p style={{ fontSize: 14, color: "#77715f", marginBottom: 20, lineHeight: 1.5 }}>
              The page hit an unexpected error. Refreshing usually fixes this — if it keeps
              happening, the backend may be temporarily unreachable.
            </p>
            <button onClick={() => window.location.reload()} style={{
              padding: "10px 22px", borderRadius: 8, border: "none", background: "#161513",
              color: "#fff", fontWeight: 700, fontSize: 13.5, cursor: "pointer",
            }}>
              Reload page
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
