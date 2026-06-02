const MAP: Array<[RegExp, string]> = [
  [/password should be at least \d+ characters?/i, "A senha está muito curta. Use uma senha maior."],
  [/password.*weak/i, "Senha muito fraca."],
  [/invalid login credentials/i, "E-mail ou senha incorretos."],
  [/email not confirmed/i, "Confirme seu e-mail antes de entrar."],
  [/user already registered/i, "Este e-mail já está cadastrado."],
  [/invalid email/i, "E-mail inválido."],
  [/email rate limit exceeded/i, "Muitas tentativas. Tente novamente em alguns minutos."],
  [/network/i, "Erro de conexão. Verifique sua internet."],
];

export function translateAuthError(message?: string): string {
  if (!message) return "Ocorreu um erro. Tente novamente.";
  for (const [re, pt] of MAP) {
    if (re.test(message)) return pt;
  }
  return message;
}