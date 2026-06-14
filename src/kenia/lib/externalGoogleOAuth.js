import { supabase } from "@/integrations/supabase/client";

const LOVABLE_PROJECT_ID = "d7f915e3-17eb-4f57-a292-74e7422a0161";
const OAUTH_BROKER_URL = "https://oauth.lovable.app/initiate";
const OAUTH_MESSAGE_ORIGINS = new Set(["https://oauth.lovable.app", "https://lovable.dev"]);
const PUBLISHED_REDIRECT_URI = "https://escritorio-kenia.lovable.app/app";

const generateState = () => {
  if (window.crypto?.getRandomValues) {
    return [...window.crypto.getRandomValues(new Uint8Array(16))]
      .map((byte) => byte.toString(16).padStart(2, "0"))
      .join("");
  }
  return `${Math.random().toString(36).slice(2)}${Date.now().toString(36)}`;
};

export const shouldUseExternalGoogleOAuth = () => {
  const host = window.location.hostname;
  return !host.endsWith(".lovable.app") && !host.endsWith(".lovableproject.com");
};

export const signInWithExternalGoogleOAuth = () => {
  const state = generateState();
  const params = new URLSearchParams({
    project_id: LOVABLE_PROJECT_ID,
    provider: "google",
    redirect_uri: PUBLISHED_REDIRECT_URI,
    response_mode: "web_message",
    state,
    prompt: "select_account",
  });
  const popup = window.open(
    `${OAUTH_BROKER_URL}?${params.toString()}`,
    "google-oauth",
    "width=520,height=720,left=120,top=80"
  );

  if (!popup) {
    return Promise.resolve({ error: new Error("O navegador bloqueou a janela do Google. Libere pop-ups e tente novamente.") });
  }

  return new Promise((resolve) => {
    let settled = false;
    const finish = (result) => {
      if (settled) return;
      settled = true;
      window.removeEventListener("message", onMessage);
      clearInterval(closedCheck);
      clearTimeout(timeout);
      popup.close();
      resolve(result);
    };

    const onMessage = async (event) => {
      if (!OAUTH_MESSAGE_ORIGINS.has(event.origin)) return;
      const data = event.data;
      if (!data || data.type !== "authorization_response") return;

      const response = data.response || {};
      if (response.state !== state) {
        finish({ error: new Error("Falha de segurança no login Google. Tente novamente.") });
        return;
      }
      if (response.error) {
        finish({ error: new Error(response.error_description || response.error || "Erro ao entrar com Google") });
        return;
      }
      if (!response.access_token || !response.refresh_token) {
        finish({ error: new Error("O Google não retornou uma sessão válida.") });
        return;
      }

      const { error } = await supabase.auth.setSession({
        access_token: response.access_token,
        refresh_token: response.refresh_token,
      });
      finish(error ? { error } : { error: null, redirected: false });
    };

    window.addEventListener("message", onMessage);
    const closedCheck = window.setInterval(() => {
      if (popup.closed) finish({ error: new Error("Login Google cancelado.") });
    }, 500);
    const timeout = window.setTimeout(() => {
      finish({ error: new Error("Tempo esgotado ao aguardar o Google. Tente novamente.") });
    }, 120000);
  });
};