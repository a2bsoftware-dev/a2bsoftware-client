"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { CheckCircle2, ChevronDown, ChevronUp, Loader2, Send, ShieldAlert } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  clearApiError,
  getApiErrorSnapshot,
  subscribeApiError,
} from "@/lib/api-error-store";

// Identifies which app an error report email came from - the backend's
// /api/public/error-reports endpoint is shared by all three frontend apps
// (vendor/client/main admin), so there's no other way for it to tell them apart.
const APP_NAME = "a2bsoftware-client";

type ReportState = "idle" | "sending" | "sent" | "failed";

// Mounted once in the root layout. apiFetch reports every non-ok API
// response (and network failure) here, so this modal is the single global
// surface for API errors across the whole app - no per-page wiring needed.
export function ApiErrorModal() {
  const error = useSyncExternalStore(subscribeApiError, getApiErrorSnapshot, () => null);
  const [showDetail, setShowDetail] = useState(false);
  const [reportState, setReportState] = useState<ReportState>("idle");

  // Each new error gets a fresh id - reset the report button whenever a
  // different error replaces whatever was previously showing.
  useEffect(() => {
    setReportState("idle");
  }, [error?.id]);

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      setShowDetail(false);
      clearApiError();
    }
  };

  // Deliberately a plain fetch, not apiFetch - a failed report must never
  // feed back into this same error store, or it would pop this modal open
  // again on top of itself.
  const handleReport = async () => {
    if (!error) return;
    setReportState("sending");
    try {
      const res = await fetch("/api/public/error-reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          app: APP_NAME,
          code: String(error.code),
          title: error.title,
          method: error.method,
          url: error.url,
          detail: error.detail,
          pageUrl: window.location.href,
          userAgent: navigator.userAgent,
          clientTimestamp: new Date().toISOString(),
        }),
      });
      setReportState(res.ok ? "sent" : "failed");
    } catch {
      setReportState("failed");
    }
  };

  return (
    <Dialog open={!!error} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-destructive">
            <ShieldAlert className="h-5 w-5 shrink-0" />
            <span>Something went wrong</span>
          </DialogTitle>
          <DialogDescription>
            API Error {error?.code}
            {error?.title ? `: ${error.title}` : ""}
          </DialogDescription>
        </DialogHeader>

        {error?.detail && (
          <div className="space-y-1.5">
            <button
              type="button"
              onClick={() => setShowDetail((prev) => !prev)}
              className="flex items-center gap-1 text-xs font-semibold text-muted-foreground hover:text-foreground"
            >
              {showDetail ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
              {showDetail ? "Hide details" : "Show more"}
            </button>
            {showDetail && (
              <pre className="max-h-72 overflow-auto rounded-md bg-muted p-3 text-[11px] leading-relaxed whitespace-pre-wrap break-words">
                {error.method} {error.url}
                {"\n\n"}
                {error.detail}
              </pre>
            )}
          </div>
        )}

        <DialogFooter className="sm:justify-between">
          <Button
            variant="secondary"
            onClick={handleReport}
            disabled={reportState === "sending" || reportState === "sent"}
          >
            {reportState === "sending" && <Loader2 className="animate-spin" />}
            {reportState === "sent" && <CheckCircle2 />}
            {(reportState === "idle" || reportState === "failed") && <Send />}
            {reportState === "sending"
              ? "Sending..."
              : reportState === "sent"
                ? "Report sent"
                : reportState === "failed"
                  ? "Failed to send - retry"
                  : "Report this error"}
          </Button>
          <Button variant="outline" onClick={() => handleOpenChange(false)}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
