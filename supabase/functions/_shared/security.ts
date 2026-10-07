const encoder = new TextEncoder();
const hex = (bytes: Uint8Array) =>
  Array.from(bytes, (x) => x.toString(16).padStart(2, '0')).join('');
export function randomToken(): string {
  return hex(crypto.getRandomValues(new Uint8Array(32)));
}
export async function hashToken(value: string): Promise<string> {
  return hex(new Uint8Array(await crypto.subtle.digest('SHA-256', encoder.encode(value))));
}
export async function hashPin(
  pin: string,
  salt = hex(crypto.getRandomValues(new Uint8Array(16))),
): Promise<string> {
  const key = await crypto.subtle.importKey('raw', encoder.encode(pin), 'PBKDF2', false, [
    'deriveBits',
  ]);
  const value = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', hash: 'SHA-256', salt: encoder.encode(salt), iterations: 600000 },
    key,
    256,
  );
  return `pbkdf2:600000:${salt}:${hex(new Uint8Array(value))}`;
}
export async function verifyPin(pin: string, stored: string): Promise<boolean> {
  if (!/^pbkdf2:600000:[a-f0-9]{32}:[a-f0-9]{64}$/.test(stored)) return false;
  const actual = await hashPin(pin, stored.split(':')[2]);
  let difference = actual.length ^ stored.length;
  for (let i = 0; i < actual.length; i++) difference |= actual.charCodeAt(i) ^ stored.charCodeAt(i);
  return difference === 0;
}
export function sessionId(jwt: string): string {
  const payload = JSON.parse(atob(jwt.split('.')[1].replace(/-/g, '+').replace(/_/g, '/'))) as {
    session_id?: string;
  };
  if (!payload.session_id || !/^[a-f0-9-]{36}$/i.test(payload.session_id))
    throw new Error('AUTH_FAILED');
  return payload.session_id;
}
