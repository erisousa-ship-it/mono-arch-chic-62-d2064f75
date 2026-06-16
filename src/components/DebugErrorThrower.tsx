import { useEffect, useState } from "react";

/**
 * DebugErrorThrower
 *
 * Componente sem UI. Escuta o evento "lovable-debug-error" e, durante o
 * render, lança um erro fatal real para acionar o overlay global da Lovable.
 * Esse throw é INTENCIONAL — não remover, não envolver em try/catch nem em
 * ErrorBoundary. O fluxo correto é: Popup -> CustomEvent -> state -> throw
 * -> overlay global -> usuário clica em "Try to Fix".
 */
export const DebugErrorThrower = () => {
  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent<string>).detail;
      if (typeof detail === "string" && detail.length > 0) {
        window.setTimeout(() => {
          throw new Error(detail);
        }, 0);
      }
    };
    window.addEventListener("lovable-debug-error", handler as EventListener);
    return () =>
      window.removeEventListener("lovable-debug-error", handler as EventListener);
  }, []);

  return null;
};
