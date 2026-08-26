"use client";

import { Component, type ErrorInfo, type ReactNode } from "react";

type Props = {
  children: ReactNode;
  /** UI tĩnh khi lỗi — không có nút Thử lại (vd. logo sidebar). */
  fallback?: ReactNode;
  /** Thông báo + nút Thử lại. Bỏ qua nếu đã truyền `fallback`. */
  message?: string;
};

type State = { error: Error | null };

/**
 * Error boundary cục bộ — lỗi chunk/HMR/RSC con không leo lên `app/error.tsx`
 * (trang «Không tải được trang»).
 */
export class SoftErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("[soft-error]", error, info.componentStack);
  }

  reset = () => {
    const err = this.state.error;
    this.setState({ error: null });
    /* RSC throw (digest) nằm trong payload — cần reload mới fetch lại. */
    if (err && "digest" in err && typeof window !== "undefined") {
      window.location.reload();
    }
  };

  render() {
    if (!this.state.error) return this.props.children;

    if (this.props.fallback) return this.props.fallback;

    return (
      <div
        className="flex flex-col items-center gap-3 px-4 py-10 text-center"
        role="alert"
      >
        <p className="text-sm text-[var(--ink-body,rgba(0,0,0,0.55))]">
          {this.props.message ?? "Không tải được phần này."}
        </p>
        <button
          type="button"
          onClick={this.reset}
          className="rounded-md bg-[var(--ink-display,rgba(0,0,0,0.85))] px-3 py-1.5 text-sm font-medium text-[var(--bg-surface,#fff)]"
        >
          Thử lại
        </button>
      </div>
    );
  }
}
