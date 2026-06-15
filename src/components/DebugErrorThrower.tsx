import { useEffect, useState } from "react";

/**
 * DebugErrorThrower
 *
 * Escuta instruções internas de debug sem derrubar a aplicação. Antes este
 * componente lançava um erro fatal intencional; isso causava tela branca no
 * preview quando a ferramenta de debug era usada como canal de instrução.
 */
export const DebugErrorThrower = () => {
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent<string>).detail;
      if (typeof detail === "string" && detail.length > 0) {
        (window as any).__lovableLastDebugInstruction = detail;
        setMessage(detail);
      }
    };
    window.addEventListener("lovable-debug-error", handler as EventListener);
    return () =>
      window.removeEventListener("lovable-debug-error", handler as EventListener);
  }, []);

  if (message) {
    console.warn("Instrução de debug recebida:", message);
  }

  return null;
};
