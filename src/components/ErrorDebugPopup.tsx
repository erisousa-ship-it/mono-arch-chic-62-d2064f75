import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { buildDebugInstructionMessage, deliverLovableDebugInstruction } from "@/components/debugInstruction";

/**
 * ErrorDebugPopup
 *
 * Popup flutuante de admin que coleta uma instrução em texto + arquivos
 * anexados e dispara um CustomEvent("lovable-debug-error"). Arquivos vão para
 * o bucket público "debug-uploads" e suas URLs são incluídas na mensagem do
 * erro intencional, para que o "Try to Fix" da Lovable possa acessá-los.
 *
 * No editor da Lovable usa CustomEvent para acionar o "Try to Fix" nativo.
 * Fora do editor salva a instrução no backend para não quebrar a tela.
 */
const BUCKET = "debug-uploads";

type Uploaded = { name: string; url: string; type: string; size: number };

export const ErrorDebugPopup = () => {
  const [open, setOpen] = useState(false);
  const [minimized, setMinimized] = useState(false);
  const [text, setText] = useState("");
  const [files, setFiles] = useState<Uploaded[]>([]);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState<{ name: string; pct: number } | null>(null);
  const [pos, setPos] = useState({ x: 16, y: 16 });
  const fileInputRef = useRef<HTMLInputElement>(null);
  const draggingRef = useRef<{ dx: number; dy: number } | null>(null);

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      if (!draggingRef.current) return;
      setPos({ x: e.clientX - draggingRef.current.dx, y: e.clientY - draggingRef.current.dy });
    };
    const onUp = () => { draggingRef.current = null; };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);

    // Secret keyword to reopen: digite "voltardebug" em qualquer lugar (fora de inputs)
    let buffer = "";
    const TRIGGERS = ["voltardebug", "voutaldebug", "debugon"];
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.isContentEditable)) return;
      if (e.key.length !== 1) return;
      buffer = (buffer + e.key.toLowerCase()).slice(-20);
      if (TRIGGERS.some((w) => buffer.includes(w))) {
        buffer = "";
        setOpen(true);
      }
    };
    window.addEventListener("keydown", onKey);

    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
      window.removeEventListener("keydown", onKey);
    };
  }, []);

  const handleUpload = async (list: FileList | null) => {
    if (!list || list.length === 0) return;
    setUploading(true);
    const out: Uploaded[] = [];
    try {
      for (const file of Array.from(list)) {
        const safe = file.name.replace(/[^a-zA-Z0-9._-]/g, "-");
        const path = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}-${safe}`;
        setProgress({ name: file.name, pct: 0 });
        const { error } = await supabase.storage.from(BUCKET).upload(path, file, {
          cacheControl: "3600",
          upsert: false,
          contentType: file.type || "application/octet-stream",
        });
        if (error) throw error;
        const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
        out.push({ name: file.name, url: data.publicUrl, type: file.type, size: file.size });
        setProgress({ name: file.name, pct: 100 });
      }
      setFiles((prev) => [...prev, ...out]);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      alert(`Falha no upload: ${msg}`);
    } finally {
      setUploading(false);
      setProgress(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const removeFile = (i: number) => setFiles((prev) => prev.filter((_, idx) => idx !== i));

  const buildMessage = () => buildDebugInstructionMessage(text, files);

  const saveFallback = async (message: string) => {
    const { data: userData } = await supabase.auth.getUser();
    const user = userData?.user;
    const instructionWithUser = user?.email
      ? `${message}\n\n---\nUSUÁRIO CONECTADO: ${user.email}`
      : message;
    const payload = {
      user_id: user?.id ?? null,
      instruction: instructionWithUser,
      attachments: files,
      status: "pending",
    };

    const { error } = await (supabase.from("debug_instructions") as any).insert(payload);
    if (!error) return;

    if (/schema cache|column/i.test(error.message || "")) {
      const { error: retryError } = await (supabase.from("debug_instructions") as any).insert({
        user_id: user?.id ?? null,
        instruction: instructionWithUser,
        attachments: files,
        status: "pending",
      });
      if (retryError) throw retryError;
      return;
    }

    throw error;
  };

  const fire = async () => {
    if (!text.trim() && files.length === 0) return;
    const message = buildMessage();
    const delivery = deliverLovableDebugInstruction(message);
    if (delivery === "skipped") {
      try {
        await saveFallback(message);
        alert("Instrução salva. O botão Try to Fix só aparece dentro do editor da Lovable; em Render/link direto não há canal nativo para obedecer automaticamente esse comando.");
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        alert(`Falha ao salvar instrução: ${msg}`);
        return;
      }
      setText("");
      setFiles([]);
      return;
    }
    setText("");
    setFiles([]);
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
      e.preventDefault();
      fire();
    }
  };

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        title="Abrir Debug Tool (admin)"
        style={{ position: "fixed", right: 16, bottom: 16, zIndex: 99999 }}
        className="h-11 w-11 rounded-full bg-black text-white shadow-2xl hover:bg-gray-800 flex items-center justify-center text-lg"
      >
        🐞
      </button>
    );
  }

  return (
    <div
      style={{ position: "fixed", left: pos.x, top: pos.y, zIndex: 99999, width: 360 }}
      className="bg-white border border-black/20 rounded-lg shadow-2xl text-sm overflow-hidden"
    >
      <div
        onMouseDown={(e) => {
          draggingRef.current = { dx: e.clientX - pos.x, dy: e.clientY - pos.y };
        }}
        className="flex items-center justify-between px-3 py-2 bg-black text-white cursor-move select-none"
      >
        <span className="font-semibold text-xs uppercase tracking-wide">Debug Tool (admin)</span>
        <div className="flex items-center gap-2">
          <button onClick={() => setMinimized((m) => !m)} className="text-xs hover:opacity-80">
            {minimized ? "▢" : "—"}
          </button>
          <button onClick={() => setOpen(false)} className="text-xs hover:opacity-80">✕</button>
        </div>
      </div>
      {!minimized && (
        <div className="p-3 space-y-2 bg-white">
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder="Digite a instrução para o Try to Fix..."
            rows={5}
            className="w-full text-xs p-2 border border-gray-300 rounded resize-y font-mono text-gray-900"
          />


          {files.length > 0 && (
            <ul className="space-y-1 max-h-28 overflow-y-auto text-[11px]">
              {files.map((f, i) => (
                <li key={i} className="flex items-center justify-between gap-2 bg-gray-100 px-2 py-1 rounded">
                  <span className="truncate text-gray-800">📎 {f.name} <span className="text-gray-500">({Math.round(f.size / 1024)} KB)</span></span>
                  <button onClick={() => removeFile(i)} className="text-red-600 hover:text-red-800">✕</button>
                </li>
              ))}
            </ul>
          )}

          {progress && (
            <div className="text-[10px] text-gray-600">Enviando {progress.name}…</div>
          )}

          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <input
                ref={fileInputRef}
                type="file"
                multiple
                onChange={(e) => handleUpload(e.target.files)}
                className="hidden"
                id="debug-file-input"
              />
              <label
                htmlFor="debug-file-input"
                className={`px-2 py-1.5 text-xs border border-gray-300 rounded cursor-pointer hover:bg-gray-50 ${uploading ? "opacity-50 pointer-events-none" : ""}`}
              >
                📎 Anexar
              </label>
              <span className="text-[10px] text-gray-500">Ctrl/Cmd+Enter</span>
            </div>
            <button
              onClick={fire}
              disabled={uploading}
              className="px-3 py-1.5 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white text-xs font-semibold rounded"
            >
              Gerar Erro
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ErrorDebugPopup;
