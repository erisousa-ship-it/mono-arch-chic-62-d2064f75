import { useEffect } from "react";

/**
 * DebugErrorThrower
 *
 * Componente sem UI. Escuta o evento global "lovable-debug-error" e, ao receber
 * uma mensagem, lança um Error DURANTE O RENDER para que o erro escape ao
 * overlay global "Try to Fix" da Lovable.
 *
 * NÃO envolver em ErrorBoundary / Suspense / try-catch.
 * NÃO trocar o throw por console.error, toast, log ou setTimeout.
 */
export const DebugErrorThrower = () => {
  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent<string>).detail;
      if (typeof detail === "string" && detail.length > 0) {
        console.error("lovable-debug-error", detail);
      }
    };
    window.addEventListener("lovable-debug-error", handler as EventListener);
    return () => window.removeEventListener("lovable-debug-error", handler as EventListener);
  }, []);

  return null;
};
