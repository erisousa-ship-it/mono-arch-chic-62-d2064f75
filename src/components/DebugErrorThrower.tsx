// Disabled: this component previously threw arbitrary errors from a window
// event, which caused blank screens and surfaced attacker-controlled text as
// "runtime errors". Kept as a no-op to preserve imports.
export const DebugErrorThrower = () => null;
