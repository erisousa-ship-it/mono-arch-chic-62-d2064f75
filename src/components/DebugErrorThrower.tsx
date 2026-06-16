import { useEffect } from "react";

/**
 * DebugErrorThrower
 *
 * Componente sem UI. Escuta o evento "lovable-debug-error" sem quebrar a tela.
 * Mensagens enviadas pelo popup de debug são mantidas para inspeção, mas não
 * devem virar erro fatal de React em produção/preview.
 */
export const DebugErrorThrower = () => {
  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent<string>).detail;
      if (typeof detail === "string" && detail.length > 0) {
        window.dispatchEvent(
          new CustomEvent("lovable-debug-instruction", { detail }),
        );
        console.info("Lovable debug instruction received", { message: detail });
      }
    };
    window.addEventListener("lovable-debug-error", handler as EventListener);
    return () =>
      window.removeEventListener("lovable-debug-error", handler as EventListener);
  }, []);

  return null;
};
