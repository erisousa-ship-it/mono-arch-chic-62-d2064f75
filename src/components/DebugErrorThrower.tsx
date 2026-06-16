import { useEffect } from "react";

/**
 * DebugErrorThrower
 *
 * Componente sem UI. Mantém compatibilidade com o evento legado
 * "lovable-debug-error", mas não derruba mais a aplicação com erro fatal.
 */
export const DebugErrorThrower = () => {
  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent<string>).detail;
      if (typeof detail === "string" && detail.length > 0) {
        console.info("[debug-instruction]", detail);
      }
    };
    window.addEventListener("lovable-debug-error", handler as EventListener);
    return () =>
      window.removeEventListener("lovable-debug-error", handler as EventListener);
  }, []);

  return null;
};
