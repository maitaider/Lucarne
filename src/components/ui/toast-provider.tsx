"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import { CheckCircle2, AlertCircle, Info, X } from "lucide-react";
import { cn } from "@/lib/utils";

type ToastKind = "success" | "error" | "info";
type Toast = { id: string; kind: ToastKind; message: string };

type ToastCtx = {
  toast: (kind: ToastKind, message: string) => void;
  success: (message: string) => void;
  error: (message: string) => void;
  info: (message: string) => void;
};

const ToastContext = createContext<ToastCtx | null>(null);

export function useToast(): ToastCtx {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    // Graceful no-op when used outside a provider (e.g. tests).
    return {
      toast: () => {},
      success: () => {},
      error: () => {},
      info: () => {},
    };
  }
  return ctx;
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const remove = useCallback((id: string) => {
    setToasts((t) => t.filter((x) => x.id !== id));
  }, []);

  const push = useCallback(
    (kind: ToastKind, message: string) => {
      const id = crypto.randomUUID();
      setToasts((t) => [...t, { id, kind, message }]);
      // Auto-dismiss after 5s
      window.setTimeout(() => remove(id), 5000);
    },
    [remove],
  );

  const ctx: ToastCtx = {
    toast: push,
    success: (m) => push("success", m),
    error: (m) => push("error", m),
    info: (m) => push("info", m),
  };

  return (
    <ToastContext.Provider value={ctx}>
      {children}
      <div
        aria-live="polite"
        aria-atomic="true"
        className="pointer-events-none fixed inset-x-0 bottom-4 z-[200] flex flex-col items-center gap-2 px-4 sm:bottom-6 sm:right-6 sm:left-auto sm:items-end"
      >
        {toasts.map((t) => (
          <ToastBubble key={t.id} toast={t} onClose={() => remove(t.id)} />
        ))}
      </div>
    </ToastContext.Provider>
  );
}

function ToastBubble({
  toast,
  onClose,
}: {
  toast: Toast;
  onClose: () => void;
}) {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const id = requestAnimationFrame(() => setVisible(true));
    return () => cancelAnimationFrame(id);
  }, []);

  const colors = {
    success: {
      icon: CheckCircle2,
      bg: "bg-primary-500/15 border-primary-500/40",
      text: "text-primary-400",
    },
    error: {
      icon: AlertCircle,
      bg: "bg-error/15 border-error/40",
      text: "text-error",
    },
    info: {
      icon: Info,
      bg: "bg-violet-500/15 border-violet-500/40",
      text: "text-violet-300",
    },
  }[toast.kind];

  const Icon = colors.icon;

  return (
    <div
      role={toast.kind === "error" ? "alert" : "status"}
      className={cn(
        "pointer-events-auto flex w-full max-w-sm items-start gap-3 rounded-[8px] border px-4 py-3 shadow-2xl backdrop-blur-xl transition-all duration-300",
        colors.bg,
        visible
          ? "translate-y-0 opacity-100"
          : "translate-y-2 opacity-0",
      )}
    >
      <Icon
        className={cn("mt-0.5 size-4 shrink-0", colors.text)}
        strokeWidth={2}
      />
      <p className="flex-1 text-sm font-medium leading-5 text-text-primary">
        {toast.message}
      </p>
      <button
        type="button"
        onClick={onClose}
        aria-label="Fermer"
        className="shrink-0 rounded-md p-0.5 text-text-tertiary transition hover:bg-white/10 hover:text-text-primary"
      >
        <X className="size-3.5" strokeWidth={2} />
      </button>
    </div>
  );
}
