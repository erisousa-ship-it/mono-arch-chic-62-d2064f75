import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/kenia/components/ui/button";
import { Input } from "@/kenia/components/ui/input";
import { Label } from "@/kenia/components/ui/label";
import { Card } from "@/kenia/components/ui/card";
import { toast } from "sonner";

export default function ResetPassword() {
  const navigate = useNavigate();
  const [ready, setReady] = useState(false);
  const [loading, setLoading] = useState(false);
  const [pwd, setPwd] = useState("");
  const [pwd2, setPwd2] = useState("");

  useEffect(() => {
    // Supabase coloca o token de recovery no hash (#access_token=...&type=recovery)
    // O cliente já consome isso automaticamente em onAuthStateChange (PASSWORD_RECOVERY).
    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY" || event === "SIGNED_IN") setReady(true);
    });
    supabase.auth.getSession().then(({ data }) => {
      if (data?.session) setReady(true);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  const submit = async (e) => {
    e.preventDefault();
    if (pwd.length < 6) return toast.error("Mínimo 6 caracteres");
    if (pwd !== pwd2) return toast.error("Senhas não conferem");
    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: pwd });
      if (error) throw error;
      toast.success("Senha atualizada com sucesso");
      navigate("/login", { replace: true });
    } catch (err) {
      toast.error(err?.message || "Erro ao atualizar senha");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-background paper-grain">
      <Card className="w-full max-w-md p-8 border-nude-200 bg-card">
        <div className="overline text-gold-600 mb-2">Recuperação</div>
        <h1 className="font-serif text-3xl text-nude-900 mb-1">Nova senha</h1>
        <p className="text-sm text-nude-500 mb-6">
          Defina uma nova senha para sua conta.
        </p>

        {!ready ? (
          <p className="text-sm text-nude-600">
            Verificando link de recuperação... Abra esta página pelo link enviado no seu e-mail.
          </p>
        ) : (
          <form onSubmit={submit} className="space-y-4">
            <div>
              <Label className="text-nude-700 text-xs uppercase tracking-wider">Nova senha</Label>
              <Input
                type="password"
                value={pwd}
                onChange={(e) => setPwd(e.target.value)}
                className="mt-1.5 h-11"
              />
            </div>
            <div>
              <Label className="text-nude-700 text-xs uppercase tracking-wider">Confirmar senha</Label>
              <Input
                type="password"
                value={pwd2}
                onChange={(e) => setPwd2(e.target.value)}
                className="mt-1.5 h-11"
              />
            </div>
            <Button
              type="submit"
              disabled={loading}
              className="w-full h-11 bg-gradient-to-r from-gold-500 to-gold-600 hover:from-gold-600 hover:to-gold-700 text-white"
            >
              {loading ? "Salvando..." : "Atualizar senha"}
            </Button>
          </form>
        )}
      </Card>
    </div>
  );
}
