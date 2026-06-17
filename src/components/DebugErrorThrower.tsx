import { useEffect } from "react";

/**
 * DebugErrorThrower
 *
 * Componente sem UI. Mantém compatibilidade com o evento global
 * "lovable-debug-error", mas NÃO converte mais a mensagem em erro fatal.
 * Isso evita tela branca persistente quando o painel de debug é usado fora do
 * fluxo nativo do editor.
 */
export const DebugErrorThrower = () => {
  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent<string>).detail;
      if (typeof detail === "string" && detail.length > 0) {
        (window as any).__lovableLastDebugInstruction = detail;
        console.info("[debug-instruction] Instrução registrada sem derrubar a tela.");
      }
    };
    window.addEventListener("lovable-debug-error", handler as EventListener);
    return () =>
      window.removeEventListener("lovable-debug-error", handler as EventListener);
  }, []);

  return null;
};
