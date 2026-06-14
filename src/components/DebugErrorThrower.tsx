import { useEffect } from "react";

/**
 * DebugErrorThrower
 *
 * Componente sem UI. Escuta o evento global "lovable-debug-error" e registra a
 * instrução sem derrubar o app. A versão anterior lançava um erro fatal e
 * deixava a tela branca no preview/produção.
 */
export const DebugErrorThrower = () => {
  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent<string>).detail;
      if (typeof detail === "string" && detail.length > 0) {
        try {
          sessionStorage.setItem("lovable-debug-last-message", detail);
        } catch {
          // Ignore storage failures in restricted browsers.
        }
        console.warn(detail);
      }
    };
    window.addEventListener("lovable-debug-error", handler as EventListener);
    return () => window.removeEventListener("lovable-debug-error", handler as EventListener);
  }, []);

  return null;
};
