import { useEffect } from "react";

/**
 * DebugErrorThrower
 *
 * Componente sem UI. Escuta o evento global "lovable-debug-error" e guarda
 * a instrução para diagnóstico sem derrubar a aplicação com tela branca.
 */
export const DebugErrorThrower = () => {
  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent<string>).detail;
      if (typeof detail === "string" && detail.trim().length > 0) {
        const debugWindow = window as typeof window & {
          __lovableLastDebugInstruction?: string;
        };
        debugWindow.__lovableLastDebugInstruction = detail.trim();
        console.info("[Lovable debug instruction]", detail.trim());
      }
    };
    window.addEventListener("lovable-debug-error", handler as EventListener);
    return () =>
      window.removeEventListener("lovable-debug-error", handler as EventListener);
  }, []);

  return null;
};
