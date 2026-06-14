import { useState } from "react";
import { toast } from "sonner";
import avatar from "@/assets/virtual-assistant.png";

const LOCAL_AGENT_URL = "http://localhost:7777/run";
const COMMAND_NAME = "ngrok-restart";
const FALLBACK_CMD = "pkill ngrok\nngrok http 11434";

/**
 * Bolinha flutuante da atendente virtual.
 *
 * Ao clicar, chama o agente local (local-agent/server.mjs em http://localhost:7777)
 * para executar `pkill ngrok; ngrok http 11434` na máquina do usuário.
 * Se o agente não estiver rodando, copia os comandos para a área de transferência.
 */
export const VirtualAssistantBubble = () => {
  const [busy, setBusy] = useState(false);

  const handleClick = async () => {
    if (busy) return;
    setBusy(true);
    try {
      try {
        const res = await fetch(LOCAL_AGENT_URL, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ command: COMMAND_NAME }),
        });
        const data = await res.json().catch(() => ({}));
        if (res.ok && data.ok) {
          toast.success("ngrok reiniciado no terminal", {
            description: "Executado pelo agente local (127.0.0.1:7777)",
          });
        } else {
          toast.error("Agente local respondeu erro", {
            description: data?.error ?? `HTTP ${res.status}`,
          });
        }
      } catch {
        // Agente local não está rodando → fallback: copia para clipboard.
        try {
          await navigator.clipboard.writeText(FALLBACK_CMD);
          toast.warning("Agente local offline", {
            description:
              "Rode `node local-agent/server.mjs`. Comandos copiados para colar no terminal.",
          });
        } catch {
          toast.message("Execute no terminal:", { description: FALLBACK_CMD });
        }
      }
    } finally {
      setTimeout(() => setBusy(false), 800);
    }
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      aria-label="Ativar IA — reiniciar ngrok"
      className="fixed left-5 bottom-5 z-50 h-14 w-14 rounded-full overflow-hidden ring-2 ring-gold-400 shadow-lg shadow-nude-900/30 hover:scale-105 active:scale-95 transition-transform bg-white disabled:opacity-60"
      data-testid="virtual-assistant-bubble"
      disabled={busy}
    >
      <img
        src={avatar}
        alt="Atendente virtual"
        width={56}
        height={56}
        loading="lazy"
        className="h-full w-full object-cover"
      />
    </button>
  );
};

export default VirtualAssistantBubble;
