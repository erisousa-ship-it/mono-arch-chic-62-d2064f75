import { useEffect, useState } from "react";

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
  // Desativado: estava interrompendo o app ao receber instruções coladas como "erro".
  return null;
};
