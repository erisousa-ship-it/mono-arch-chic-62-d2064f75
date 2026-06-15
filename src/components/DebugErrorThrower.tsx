import { useEffect, useState } from "react";

/**
 * DebugErrorThrower
 *
 * Componente sem UI. Mantém compatibilidade com eventos antigos de debug, mas
 * não converte mais instruções internas em erro fatal. Isso evita tela branca
 * quando a ferramenta de debug é usada dentro do app publicado/preview.
 */
export const DebugErrorThrower = () => {
  const [, setLastMessage] = useState<string | null>(null);

  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent<string>).detail;
      if (typeof detail === "string" && detail.length > 0) {
        (window as any).__lovableLastDebugInstruction = detail;
        setLastMessage(detail);
        console.info("Instrução de debug registrada", detail);
      }
    };
    window.addEventListener("lovable-debug-error", handler as EventListener);
    window.addEventListener("lovable-debug-instruction", handler as EventListener);
    return () =>
      {
        window.removeEventListener("lovable-debug-error", handler as EventListener);
        window.removeEventListener("lovable-debug-instruction", handler as EventListener);
      };
  }, []);

  return null;
};
