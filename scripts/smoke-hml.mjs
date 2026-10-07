// Explicit HML release check. Passwords belong in an ignored local env file, never in VITE_*.
import assert from 'node:assert/strict';
import { createClient } from '@supabase/supabase-js';
const url = process.env.VITE_SUPABASE_URL;
const key = process.env.VITE_SUPABASE_PUBLISHABLE_KEY;
if (process.env.RUN_HML_SMOKE !== '1' || url !== 'https://xghrambcwigdemxancxr.supabase.co' || !key)
  throw new Error('Este teste só executa com RUN_HML_SMOKE=1 no HML aprovado.');
const client = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
async function login(username, password) {
  const response = await fetch(`${url}/functions/v1/foundation`, {
    method: 'POST',
    headers: { apikey: key, 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'password', username, password }),
  });
  const body = await response.json();
  return { status: response.status, body };
}
for (const [username, variable, expectedRole] of [
  ['admin.hml', 'HML_ADMIN_PASSWORD', 'ADMIN'],
  ['controlador.hml', 'HML_CONTROLLER_PASSWORD', 'STOCK_CONTROLLER'],
  ['ti.hml', 'HML_IT_PASSWORD', 'IT'],
]) {
  if (!process.env[variable]) throw new Error(`Configure ${variable} localmente.`);
  const response = await login(username, process.env[variable]);
  assert.equal(response.status, 200, `Login HML de ${expectedRole} deve funcionar.`);
  const session = await client.auth.setSession(response.body.session);
  assert.equal(session.error, null, 'Sessão Supabase válida.');
  const me = await client.rpc('my_profile');
  assert.equal(me.error, null);
  assert.equal(me.data.role, expectedRole);
  const direct = await client.from('manufacturers').insert({ name: 'DML PROIBIDO' });
  assert.ok(direct.error, 'DML direto deve ser bloqueado, inclusive para Admin.');
  const heartbeat = await client.rpc('touch_session');
  assert.equal(heartbeat.error, null);
  if (expectedRole !== 'ADMIN') {
    const denied = await client.rpc('get_exceptional_settings');
    assert.ok(denied.error, 'Configuração excepcional exige Admin.');
  }
  const ended = await client.rpc('end_session');
  assert.equal(ended.error, null);
  const after = await client.rpc('my_profile');
  assert.equal(after.data, null, 'JWT anterior não opera após logout.');
  await client.auth.signOut({ scope: 'local' });
  console.log(`${expectedRole}: login, perfil, DML bloqueado e logout passaram.`);
}
const invalid = await login('inexistente.hml', 'invalid-password-test');
assert.equal(invalid.body.code, 'AUTH_FAILED');
console.log('Smoke HML passou. QR, PIN, scanner físico e aceite manual permanecem no checklist.');
