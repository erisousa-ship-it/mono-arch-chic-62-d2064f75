import { useEffect } from "react";

/**
 * DebugErrorThrower
 *
 * Componente sem UI. Escuta o evento global "lovable-debug-error" e guarda
 * a instrução para depuração sem derrubar a aplicação em produção/preview.
 */
export const DebugErrorThrower = () => {
  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent<string>).detail;
      if (typeof detail === "string" && detail.length > 0) {
        (window as any).__lovableLastDebugInstruction = detail;
        if (import.meta.env.DEV) {
          console.info("Instrução de debug recebida:", detail);
        }
      }
    };
    window.addEventListener("lovable-debug-error", handler as EventListener);
    return () =>
      window.removeEventListener("lovable-debug-error", handler as EventListener);
  }, []);

  return null;
};
