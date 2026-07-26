"use client";

import { useState, useSyncExternalStore } from "react";
import { ChevronDown, ChevronUp, ShieldAlert } from "lucide-react";
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

// Mounted once in the root layout. apiFetch reports every non-ok API
// response (and network failure) here, so this modal is the single global
// surface for API errors across the whole app - no per-page wiring needed.
export function ApiErrorModal() {
  const error = useSyncExternalStore(subscribeApiError, getApiErrorSnapshot, () => null);
  const [showDetail, setShowDetail] = useState(false);

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      setShowDetail(false);
      clearApiError();
    }
  };

  return (
    <Dialog open={!!error} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-destructive">
            <ShieldAlert className="h-5 w-5 shrink-0" />
            <span>API Error {error?.code}</span>
          </DialogTitle>
          <DialogDescription>{error?.title}</DialogDescription>
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

        <DialogFooter>
          <Button variant="outline" onClick={() => handleOpenChange(false)}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
