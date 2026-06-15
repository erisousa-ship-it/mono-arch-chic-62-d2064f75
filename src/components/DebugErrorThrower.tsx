import { useEffect } from "react";

/**
 * DebugErrorThrower
 *
 * Componente sem UI. Escuta o evento global "lovable-debug-error" e converte
 * a mensagem em erro fatal de runtime para acionar o overlay "Try to Fix" da
 * Lovable. O throw é INTENCIONAL — não envolver em try/catch nem ErrorBoundary.
 */
export const DebugErrorThrower = () => {
  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent<string>).detail;
      if (typeof detail === "string" && detail.length > 0) {
        (window as any).__lovableLastDebugInstruction = detail;
        console.warn("Instrução de debug registrada sem derrubar a tela:", detail);
      }
    };
    window.addEventListener("lovable-debug-error", handler as EventListener);
    return () => window.removeEventListener("lovable-debug-error", handler as EventListener);
  }, []);

  return null;
};
