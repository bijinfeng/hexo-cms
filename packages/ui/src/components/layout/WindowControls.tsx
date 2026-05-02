import { useState, useEffect } from "react";
import { Minus, Square, X } from "lucide-react";

declare global {
  interface Window {
    electronAPI?: {
      invoke: (channel: string, ...args: any[]) => Promise<any>;
    };
  }
}

export function WindowControls() {
  const [maximized, setMaximized] = useState(false);

  useEffect(() => {
    if (!window.electronAPI) return;
    window.electronAPI.invoke("window:isMaximized").then((v: boolean) => setMaximized(v));

    function onMaximize() { setMaximized(true); }
    function onUnmaximize() { setMaximized(false); }

    window.addEventListener("maximize", onMaximize);
    window.addEventListener("unmaximize", onUnmaximize);
    return () => {
      window.removeEventListener("maximize", onMaximize);
      window.removeEventListener("unmaximize", onUnmaximize);
    };
  }, []);

  function minimize() { window.electronAPI?.invoke("window:minimize"); }
  function toggleMaximize() { window.electronAPI?.invoke(maximized ? "window:unmaximize" : "window:maximize"); }
  function close() { window.electronAPI?.invoke("window:close"); }

  const btnClass = "w-8 h-8 flex items-center justify-center rounded-md text-[var(--text-tertiary)] hover:bg-[var(--bg-muted)] hover:text-[var(--text-primary)] transition-colors cursor-pointer";

  return (
    <div className="flex items-center gap-0.5">
      <button onClick={minimize} className={btnClass}>
        <Minus size={14} />
      </button>
      <button onClick={toggleMaximize} className={btnClass}>
        <Square size={12} />
      </button>
      <button onClick={close} className={btnClass + " hover:bg-[#ef4444] hover:text-white"}>
        <X size={14} />
      </button>
    </div>
  );
}
