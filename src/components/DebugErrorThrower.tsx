import { useEffect } from "react";

/**
 * DebugErrorThrower
 *
 * Componente sem UI. Escuta o evento "lovable-debug-error" e registra a
 * instrução sem quebrar a aplicação. Antes ele lançava um erro fatal de render,
 * o que deixava a prévia em tela branca sempre que o admin enviava uma instrução.
 */
export const DebugErrorThrower = () => {
  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent<string>).detail;
      if (typeof detail === "string" && detail.length > 0) {
        console.warn("[debug-instruction]", detail);
        window.dispatchEvent(new CustomEvent("lovable-debug-instruction", { detail }));
      }
    };
    window.addEventListener("lovable-debug-error", handler as EventListener);
    return () =>
      window.removeEventListener("lovable-debug-error", handler as EventListener);
  }, []);

  return null;
};
