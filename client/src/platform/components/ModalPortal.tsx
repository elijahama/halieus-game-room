import { useRef, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { useModalLifecycle } from "./useModalLifecycle";
export function ModalPortal({ children, onClose }: { children: ReactNode; onClose: () => void }) {
  const ref = useRef<HTMLDivElement>(null);
  useModalLifecycle(true, ref, onClose);
  return createPortal(<div ref={ref} style={{ display: "contents" }}>{children}</div>, document.fullscreenElement ?? document.body);
}
