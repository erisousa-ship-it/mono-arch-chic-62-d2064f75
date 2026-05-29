import { useEffect, useState } from "react";

const DEVELOPMENT_INSTRUCTION_PREFIX = "INSTRUÇÃO DE DESENVOLVIMENTO";

export const DebugErrorThrower = () => {
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent<string>).detail;
      if (typeof detail === "string" && detail.length > 0) {
        setMessage(detail);
      }
    };
    window.addEventListener("lovable-debug-error", handler as EventListener);
    return () => window.removeEventListener("lovable-debug-error", handler as EventListener);
  }, []);

  if (message?.startsWith(DEVELOPMENT_INSTRUCTION_PREFIX)) {
    console.info(message);
    return null;
  }

  if (message) {
    throw new Error(message);
  }

  return null;
};
