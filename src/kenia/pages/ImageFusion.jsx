import { useState, useRef } from "react";
import { api } from "@/kenia/lib/api";
import { Card } from "@/kenia/components/ui/card";
import { Button } from "@/kenia/components/ui/button";
import { Textarea } from "@/kenia/components/ui/textarea";
import { Label } from "@/kenia/components/ui/label";
import { toast } from "sonner";
import { Combine, Upload, Loader2, Download, X, Sparkles, ImageIcon, Wand2 } from "lucide-react";

// Preset de rejuvenescimento facial preservando identidade
const REJUVENATE_PROMPT = `Rejuvenescer o rosto da pessoa preservando integralmente sua identidade facial, proporções, formato do rosto, olhos, nariz, boca, mandíbula e características únicas. Reduzir suavemente rugas, linhas de expressão profundas, flacidez leve e sinais de envelhecimento da pele. Melhorar a textura da pele de forma natural, mantendo poros, detalhes e aparência realista. Preservar tom de pele, expressão facial, penteado e iluminação original. Não alterar idade para aparência infantil ou artificial. Não modificar traços étnicos, estrutura óssea, peso facial ou características que identifiquem a pessoa. Resultado fotorealista, alta definição, aspecto natural de 5 a 15 anos mais jovem, sem efeito plástico, sem excesso de suavização, sem filtros de beleza exagerados.\n\nPrompt negativo: Não mudar identidade, não alterar formato dos olhos, nariz ou boca, não afinar o rosto, não aumentar lábios, não modificar cor dos olhos, não trocar penteado, não criar aparência artificial, não aplicar efeito de boneca, não remover todos os poros, não alterar expressão facial, não adicionar maquiagem excessiva, não gerar rosto diferente, não modificar ângulo da foto, não criar simetria artificial.\n\nIdentity preservation priority: maximum. Facial structure lock. Photorealistic age regression. Natural skin restoration. Maintain exact likeness.`;

// Diretriz padrão de preservação de identidade (sempre enviada à IA)
const IDENTITY_LOCK = `DIRETRIZ OBRIGATÓRIA — PRESERVAÇÃO DE IDENTIDADE:
Ao fundir as duas imagens, preserve integralmente a identidade facial e corporal das pessoas presentes: formato do rosto, olhos, nariz, boca, mandíbula, sobrancelhas, orelhas, tom de pele, traços étnicos, estrutura óssea, expressão e penteado. Não troque rostos, não gere rostos novos, não altere ângulo, não aplique filtro de beleza, não suavize em excesso. Resultado fotorealista, alta definição, mantendo a semelhança exata das pessoas das fotos originais.`;

function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result);
    r.onerror = reject;
    r.readAsDataURL(file);
  });
}

function ImagePicker({ value, onChange, label, testidPrefix }) {
  const inputRef = useRef(null);
  return (
    <div className="space-y-2">
      <Label className="text-gold-200">{label}</Label>
      <div
        onClick={() => inputRef.current?.click()}
        className="relative aspect-square w-full rounded-lg border-2 border-dashed border-gold-700/40 bg-nude-900/40 hover:border-gold-500/60 hover:bg-nude-900/60 transition-colors cursor-pointer overflow-hidden grid place-items-center"
        data-testid={`${testidPrefix}-dropzone`}
      >
        {value ? (
          <>
            <img src={value} alt="preview" className="w-full h-full object-cover" />
            <button
              onClick={(e) => { e.stopPropagation(); onChange(null); }}
              className="absolute top-2 right-2 w-7 h-7 rounded-full bg-nude-950/80 grid place-items-center hover:bg-rose-600 transition-colors"
              data-testid={`${testidPrefix}-clear`}
            >
              <X className="w-3.5 h-3.5 text-white" />
            </button>
          </>
        ) : (
          <div className="text-center px-6">
            <Upload className="w-8 h-8 text-gold-400/60 mx-auto mb-2" />
            <div className="text-sm text-gold-200/80 font-medium">Clique para enviar</div>
            <div className="text-xs text-nude-500 mt-1">PNG, JPG até 8 MB</div>
          </div>
        )}
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          className="hidden"
          data-testid={`${testidPrefix}-input`}
          onChange={async (e) => {
            const file = e.target.files?.[0];
            if (!file) return;
            if (file.size > 8 * 1024 * 1024) { toast.error("Imagem deve ter até 8 MB"); return; }
            const b64 = await fileToBase64(file);
            onChange(b64);
          }}
        />
      </div>
    </div>
  );
}

export default function ImageFusion() {
  const [img1, setImg1] = useState(null);
  const [img2, setImg2] = useState(null);
  const [prompt, setPrompt] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);

  const fuse = async () => {
    if (!img1 || !img2) { toast.error("Envie as duas imagens antes de gerar"); return; }
    setLoading(true);
    setResult(null);
    try {
      const finalPrompt = `${IDENTITY_LOCK}\n\n${prompt || "Crie uma fusão coerente preservando a aparência das pessoas das duas fotos."}`;
      const { data } = await api.post(
        "/creatives/fuse-images",
        { image1_base64: img1, image2_base64: img2, prompt: finalPrompt },
        { timeout: 180000 }
      );
      if (data.ok && data.image) {
        setResult(data.image);
        toast.success("Imagem gerada com sucesso!");
      } else {
        toast.error(data.error || "Não foi possível gerar a imagem");
      }
    } catch (e) {
      toast.error(e.response?.data?.detail || "Erro ao gerar imagem");
    } finally {
      setLoading(false);
    }
  };

  const downloadOriginal = () => {
    if (!result) return;
    const a = document.createElement("a");
    a.href = result;
    a.download = `fusao-original-${Date.now()}.png`;
    a.click();
  };

  return (
    <div className="min-h-screen flex flex-col bg-nude-950 text-gold-50">
      <div className="px-4 sm:px-6 py-4 bg-nude-900/60 border-b border-gold-900/40">
        <div className="text-xs tracking-[0.2em] uppercase text-gold-400 font-semibold flex items-center gap-1.5">
          <Sparkles className="w-3 h-3" /> Estúdio criativo
        </div>
        <h1 className="font-display font-bold text-xl sm:text-2xl mt-1 text-gold-100 flex items-center gap-2">
          <Combine className="w-5 h-5 sm:w-6 sm:h-6 text-gold-400 shrink-0" />
          Fusão de Imagens com IA
        </h1>
        <p className="text-xs sm:text-sm text-nude-400 mt-1">
          Envie duas imagens e use a IA para criar uma nova fusão a partir delas.
        </p>
      </div>

      <div className="flex-1 overflow-auto p-4 sm:p-6">
        <div className="max-w-5xl mx-auto grid grid-cols-2 lg:grid-cols-[1fr_1fr_1.2fr] gap-3 sm:gap-5">
          <Card className="p-3 sm:p-4 bg-nude-900/60 border-gold-900/40">
            <ImagePicker value={img1} onChange={setImg1} label="Imagem 1" testidPrefix="img1" />
          </Card>
          <Card className="p-3 sm:p-4 bg-nude-900/60 border-gold-900/40">
            <ImagePicker value={img2} onChange={setImg2} label="Imagem 2" testidPrefix="img2" />
          </Card>
          <Card className="col-span-2 lg:col-span-1 p-3 sm:p-4 bg-nude-900/60 border-gold-900/40 flex flex-col">
            <Label className="text-gold-200">Resultado</Label>
            <div className="mt-2 aspect-square rounded-lg bg-nude-950 border border-gold-900/40 grid place-items-center overflow-hidden">
              {loading ? (
                <div className="text-center">
                  <Loader2 className="w-8 h-8 text-gold-400 animate-spin mx-auto mb-2" />
                  <div className="text-sm text-gold-200">Gerando fusão... 20-40s</div>
                </div>
              ) : result ? (
                <img src={result} alt="resultado" className="w-full h-full object-cover" data-testid="fusion-result-img" />
              ) : (
                <div className="text-center text-nude-500">
                  <ImageIcon className="w-10 h-10 mx-auto mb-2 opacity-40" />
                  <div className="text-xs">O resultado aparecerá aqui</div>
                </div>
              )}
            </div>
            {result && (
              <Button onClick={downloadOriginal} variant="outline" size="sm"
                className="mt-3 border-gold-700/50 text-gold-200 hover:bg-gold-500/10 hover:text-gold-100">
                <Download className="w-4 h-4 mr-2" /> Baixar imagem
              </Button>
            )}
          </Card>
        </div>

        <Card className="max-w-5xl mx-auto p-4 sm:p-5 bg-nude-900/60 border-gold-900/40 mt-4 sm:mt-5">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <Label className="text-gold-200">Instrução adicional (opcional)</Label>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setPrompt((p) => (p ? p + "\n\n" : "") + REJUVENATE_PROMPT)}
              className="border-gold-700/50 text-gold-200 hover:bg-gold-500/10 hover:text-gold-100 text-xs sm:text-sm whitespace-normal h-auto py-1.5 text-left"
              data-testid="fusion-rejuvenate-preset"
            >
              <Wand2 className="w-3.5 h-3.5 mr-1.5 shrink-0" /> Preset: rejuvenescer rosto
            </Button>
          </div>
          <p className="text-[11px] text-nude-500 mt-1">
            A identidade das pessoas é preservada automaticamente em toda fusão.
          </p>
          <Textarea rows={4} value={prompt} onChange={(e) => setPrompt(e.target.value)}
            placeholder="Ex: Mescle as duas imagens em estilo dourado elegante. Use o botão acima para aplicar o preset de rejuvenescimento facial."
            data-testid="fusion-prompt"
            className="bg-nude-950 border-gold-900/40 text-gold-100 placeholder:text-nude-600 mt-2" />
          <div className="flex justify-end mt-4">
            <Button onClick={fuse} disabled={loading || !img1 || !img2}
              className="w-full sm:w-auto bg-gradient-to-r from-gold-500 to-gold-700 hover:from-gold-400 hover:to-gold-600 text-nude-950 font-semibold"
              data-testid="fusion-generate">
              {loading ? (<><Loader2 className="w-4 h-4 mr-2 animate-spin" />Gerando...</>) :
               (<><Sparkles className="w-4 h-4 mr-2" />Gerar fusão</>)}
            </Button>
          </div>
        </Card>
      </div>
    </div>
  );
}
