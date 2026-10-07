// Run only in a trusted terminal. Never import this script into the frontend.
import { createClient } from '@supabase/supabase-js';
import { hashPin, randomToken } from '../supabase/functions/_shared/security.ts';
import {
  requireNewPassword,
  PASSWORD_POLICY_MESSAGE,
} from '../supabase/functions/_shared/password-policy.ts';
const ref = 'xghrambcwigdemxancxr';
if (
  process.env.APP_ENV !== 'HML' ||
  process.env.HML_PROJECT_REF !== ref ||
  process.env.SUPABASE_URL !== `https://${ref}.supabase.co`
)
  throw new Error('Este script só permite o HML aprovado.');
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!key) throw new Error('Configure SUPABASE_SERVICE_ROLE_KEY somente no terminal/backend.');
const client = createClient(process.env.SUPABASE_URL, key, {
  auth: { persistSession: false, autoRefreshToken: false },
});
const normal = [
  ['ADMIN', 'admin.hml', 'Administrador HML', 'HML_ADMIN_PASSWORD'],
  ['STOCK_CONTROLLER', 'controlador.hml', 'Controlador HML', 'HML_CONTROLLER_PASSWORD'],
  ['IT', 'ti.hml', 'TI HML', 'HML_IT_PASSWORD'],
];
const exceptional = [
  ['MONITORING', 'monitoramento', 'Monitoramento', null],
  ['THIRD_PARTY', 'terceiro', 'Terceiro', null],
];
for (const [role, username, name, variable] of [...normal, ...exceptional]) {
  const email = `bootstrap.${role.toLowerCase()}@identity.estoque.invalid`;
  const lookup = await client.rpc('provisioned_auth_id', { p_email: email });
  if (lookup.error) throw new Error('Falha ao consultar bootstrap. Aplique as migrations.');
  let id = lookup.data;
  if (!id) {
    // Existing identities are never reset or checked against the new-password policy.
    let password;
    try {
      password = requireNewPassword(variable ? process.env[variable] : `${randomToken()}Aa1!`);
    } catch {
      throw new Error(
        `Configure ${variable || role}: ${PASSWORD_POLICY_MESSAGE} O valor não será impresso.`,
      );
    }
    const response = await client.auth.admin.createUser({
      email,
      email_confirm: true,
      password,
    });
    if (response.error)
      throw new Error(`Falha ao criar identidade ${role}. Verifique a configuração HML.`);
    id = response.data.user.id;
  }
  const result = await client.rpc('bootstrap_identity', {
    p_auth_id: id,
    p_username: username,
    p_name: name,
    p_role: role,
  });
  if (result.error)
    throw new Error(`Falha ao vincular ${role}. Verifique migrations e estado do bootstrap.`);
  console.log(`Identidade ${role}: preparada.`);
}
// Initial PIN specified by MASTER, stored only as a salted slow hash in private schema.
const pin = await client.rpc('bootstrap_pin', { p_hash: await hashPin('5555') });
if (pin.error) throw new Error('Falha ao preparar PIN.');
console.log('Bootstrap HML concluído. Nenhuma credencial foi exibida.');
