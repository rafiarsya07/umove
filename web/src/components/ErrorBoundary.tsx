import { Component, type ReactNode } from "react";
import { isChunkError, reloadOnce } from "../lib/recover";
import { btn } from "./ui";

type Props = { children: ReactNode; title: string; body: string; action: string; resetKey?: string };

/**
 * Last line of defence: if a page crashes while rendering, show a calm
 * message with a reload button instead of a blank white screen. Moving to
 * another page (a new resetKey) clears it.
 */
export class ErrorBoundary extends Component<Props, { error: unknown; key?: string }> {
  state: { error: unknown; key?: string } = { error: null, key: this.props.resetKey };

  static getDerivedStateFromError(error: unknown) {
    return { error };
  }

  static getDerivedStateFromProps(props: Props, state: { error: unknown; key?: string }) {
    if (props.resetKey !== state.key) return { error: null, key: props.resetKey };
    return null;
  }

  componentDidCatch(error: unknown) {
    // An old tab after a release: fetch the new version instead of showing an error.
    if (isChunkError(error)) reloadOnce();
    console.error(error);
  }

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <div className="mx-auto max-w-md px-4 py-20 text-center" role="alert">
        <h1 className="t-section-title">{this.props.title}</h1>
        <p className="t-meta mt-2">{this.props.body}</p>
        <button type="button" className={`${btn.primary} mt-6`} onClick={() => window.location.reload()}>
          {this.props.action}
        </button>
      </div>
    );
  }
}
