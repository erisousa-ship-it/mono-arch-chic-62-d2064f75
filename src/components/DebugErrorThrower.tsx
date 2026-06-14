import { useEffect } from "react";

/**
 * DebugErrorThrower
 *
 * Componente sem UI. Mantém compatibilidade com o evento global
 * "lovable-debug-error", mas não derruba mais a aplicação.
 */
export const DebugErrorThrower = () => {
  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent<string>).detail;
      if (typeof detail === "string" && detail.length > 0) {
        console.info("Instrução de debug recebida:", detail);
      }
    };
    window.addEventListener("lovable-debug-error", handler as EventListener);
    return () => window.removeEventListener("lovable-debug-error", handler as EventListener);
  }, []);

  return null;
};
