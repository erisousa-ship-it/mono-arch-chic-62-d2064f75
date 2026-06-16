import { useEffect } from "react";

/**
 * DebugErrorThrower
 *
 * Componente sem UI. Escuta o evento legado "lovable-debug-error" sem lançar
 * exceção fatal. Antes ele fazia `throw new Error(message)`, o que transformava
 * instruções do debug interno em runtime errors reais e deixava a tela em branco.
 */
export const DebugErrorThrower = () => {
  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent<string>).detail;
      if (typeof detail === "string" && detail.length > 0) {
        console.info("[DebugInstruction]", detail);
        try {
          sessionStorage.setItem("last_debug_instruction", detail.slice(0, 4000));
        } catch {
          // Ignore storage quota/privacy-mode failures; debug instructions must not crash the app.
        }
      }
    };
    window.addEventListener("lovable-debug-error", handler as EventListener);
    return () =>
      window.removeEventListener("lovable-debug-error", handler as EventListener);
  }, []);

  return null;
};
