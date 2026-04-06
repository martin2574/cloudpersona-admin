import { useEffect, type ReactElement } from "react";
import { useBlocker } from "react-router-dom";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

/**
 * dirty 상태일 때 페이지 이탈을 방지하는 훅.
 * - SPA 내 라우트 이동: useBlocker로 차단 + 확인 다이얼로그
 * - 브라우저 새로고침/탭 닫기: beforeunload로 차단
 */
export default function useUnsavedChanges(dirty: boolean): ReactElement | null {
  const blocker = useBlocker(
    ({ currentLocation, nextLocation }) =>
      dirty && currentLocation.pathname !== nextLocation.pathname,
  );

  useEffect(() => {
    if (!dirty) return;
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [dirty]);

  const dialog =
    blocker.state === "blocked" ? (
      <Dialog open onOpenChange={() => blocker.reset()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Unsaved Changes</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            You have unsaved changes. Are you sure you want to leave?
          </p>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => blocker.reset()}>
              Stay
            </Button>
            <Button variant="destructive" onClick={() => blocker.proceed()}>
              Leave
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    ) : null;

  return dialog;
}
