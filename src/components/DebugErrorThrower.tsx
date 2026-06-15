import { useEffect, useState } from "react";

/**
 * DebugErrorThrower
 *
 * Componente sem UI. Escuta o evento global "lovable-debug-error" e registra a
 * instrução sem derrubar a aplicação em produção/preview.
 */
export const DebugErrorThrower = () => {
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent<string>).detail;
      if (typeof detail === "string" && detail.length > 0) {
        setMessage(detail);
      }
    };
    window.addEventListener("lovable-debug-error", handler as EventListener);
    return () => window.removeEventListener("lovable-debug-error", handler as EventListener);
  }, []);

  useEffect(() => {
    if (!message) return;
    console.warn("Instrução de debug recebida sem interromper a interface:", message);
    window.dispatchEvent(new CustomEvent("lovable-debug-instruction-received", { detail: message }));
    setMessage(null);
  }, [message]);

  return null;
};
