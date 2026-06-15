// DebugErrorThrower foi desativado: estava sendo usado para disparar erros
// de runtime artificiais a partir de eventos do window, o que travava a app
// com tela branca. Mantemos um stub no-op para preservar imports existentes.
export const DebugErrorThrower = () => null;
