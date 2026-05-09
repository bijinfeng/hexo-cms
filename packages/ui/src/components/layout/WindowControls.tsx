import { useState, useEffect } from "react";
import { Minus, Square, X } from "lucide-react";

type ElectronWindowControlsAPI = {
  invoke: (channel: string, ...args: any[]) => Promise<any>;
};

function getElectronAPI(): ElectronWindowControlsAPI | null {
  return (window as typeof globalThis & { electronAPI?: ElectronWindowControlsAPI }).electronAPI ?? null;
}

export function WindowControls() {
  const [maximized, setMaximized] = useState(false);

  useEffect(() => {
    const electronAPI = getElectronAPI();
    if (!electronAPI) return;
    electronAPI.invoke("window:isMaximized").then((v: boolean) => setMaximized(v));

    function onMaximize() { setMaximized(true); }
    function onUnmaximize() { setMaximized(false); }

    window.addEventListener("maximize", onMaximize);
    window.addEventListener("unmaximize", onUnmaximize);
    return () => {
      window.removeEventListener("maximize", onMaximize);
      window.removeEventListener("unmaximize", onUnmaximize);
    };
  }, []);

  function minimize() { getElectronAPI()?.invoke("window:minimize"); }
  function toggleMaximize() { getElectronAPI()?.invoke(maximized ? "window:unmaximize" : "window:maximize"); }
  function close() { getElectronAPI()?.invoke("window:close"); }

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
