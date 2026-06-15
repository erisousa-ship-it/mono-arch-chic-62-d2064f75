import { useEffect, useState } from "react";

/**
 * DebugErrorThrower
 *
 * Componente sem UI. Antes ele convertia instruções internas em erro fatal,
 * o que derrubava a tela do app em produção/preview. Agora apenas registra a
 * instrução para diagnóstico, sem quebrar a experiência do usuário.
 */
export const DebugErrorThrower = () => {
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent<string>).detail;
      if (typeof detail === "string" && detail.length > 0) {
        (window as any).__lovableLastDebugInstruction = detail;
        setMessage(detail);
        console.warn("Instrução de debug registrada sem interromper o app:", detail);
      }
    };
    window.addEventListener("lovable-debug-error", handler as EventListener);
    return () =>
      window.removeEventListener("lovable-debug-error", handler as EventListener);
  }, []);

  if (message) {
    return null;
  }

  return null;
};
