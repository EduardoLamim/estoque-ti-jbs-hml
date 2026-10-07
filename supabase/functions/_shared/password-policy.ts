// Public policy only: shared by UI, Edge and trusted bootstrap. Never log the input.
export const PASSWORD_MIN_LENGTH = 8;
export const PASSWORD_MAX_LENGTH = 128;
export const PASSWORD_POLICY_MESSAGE =
  'Use de 8 a 128 caracteres, com pelo menos uma letra, um número e um caractere especial.';

export function validNewPassword(value: unknown): value is string {
  return (
    typeof value === 'string' &&
    value.length >= PASSWORD_MIN_LENGTH &&
    value.length <= PASSWORD_MAX_LENGTH &&
    /\p{L}/u.test(value) &&
    /\p{Nd}/u.test(value) &&
    /[\p{P}\p{S}]/u.test(value)
  );
}

export function requireNewPassword(value: unknown): string {
  if (!validNewPassword(value)) throw new Error('PASSWORD_POLICY');
  return value;
}
