import { useEffect } from "react";

/**
 * DebugErrorThrower
 *
 * Componente sem UI. Escuta o evento global "lovable-debug-error" e guarda
 * a última instrução sem derrubar a aplicação. Antes ele relançava a mensagem
 * como erro fatal, causando tela branca quando o usuário enviava um debug.
 */
export const DebugErrorThrower = () => {
  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent<string>).detail;
      if (typeof detail === "string" && detail.length > 0) {
        (window as any).__lovableLastDebugInstruction = detail;
        console.info("Lovable debug instruction captured:", detail);
      }
    };
    window.addEventListener("lovable-debug-error", handler as EventListener);
    return () =>
      window.removeEventListener("lovable-debug-error", handler as EventListener);
  }, []);

  return null;
};
