import { useEffect } from "react";

/**
 * DebugErrorThrower
 *
 * Mantém compatibilidade com o evento antigo de debug, mas não derruba mais
 * a aplicação. Antes este componente lançava um erro em render e causava tela
 * branca sempre que o popup de debug era usado.
 */
export const DebugErrorThrower = () => {
  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent<string>).detail;
      if (typeof detail === "string" && detail.length > 0) {
        console.error(detail);
      }
    };
    window.addEventListener("lovable-debug-error", handler as EventListener);
    return () => window.removeEventListener("lovable-debug-error", handler as EventListener);
  }, []);

  return null;
};
