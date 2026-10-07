import { createClient } from 'npm:@supabase/supabase-js@2.117.2';
import { hashPin, hashToken, randomToken, sessionId, verifyPin } from '../_shared/security.ts';
import { businessCode } from '../_shared/errors.ts';
import { requireNewPassword } from '../_shared/password-policy.ts';

const url = Deno.env.get('SUPABASE_URL') || '';
const anon = Deno.env.get('SUPABASE_ANON_KEY') || '';
const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
const options = {
  auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
};
const origins = (Deno.env.get('ALLOWED_ORIGINS') || '')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);
const uuid = (value: unknown): value is string =>
  typeof value === 'string' &&
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
function requireText(value: unknown, max = 256): string {
  if (typeof value !== 'string' || !value || value.length > max) throw new Error('INVALID_INPUT');
  return value;
}
function requirePin(value: unknown): string {
  const pin = requireText(value, 32);
  if (!/^\d{4,32}$/.test(pin)) throw new Error('INVALID_INPUT');
  return pin;
}
// Never log request bodies, auth responses, tokens, PINs or provider error messages.
export async function handler(request: Request): Promise<Response> {
  const correlation = `ERR-${crypto.randomUUID()}`;
  const origin = request.headers.get('origin');
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'Cache-Control': 'no-store',
    Vary: 'Origin',
  };
  if (origin && origins.includes(origin)) headers['Access-Control-Allow-Origin'] = origin;
  const respond = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), { status, headers });
  if (origin && !origins.includes(origin)) return respond({ code: 'FORBIDDEN', correlation }, 403);
  if (request.method === 'OPTIONS')
    return new Response(null, {
      status: 204,
      headers: {
        ...headers,
        'Access-Control-Allow-Headers': 'authorization,apikey,content-type,x-client-info',
        'Access-Control-Allow-Methods': 'POST,OPTIONS',
      },
    });
  if (request.method !== 'POST') return respond({ code: 'INVALID_INPUT', correlation }, 405);
  let loginRequest = true;
  try {
    const bodyText = await request.text();
    if (bodyText.length > 16384) throw new Error('INVALID_INPUT');
    const body = JSON.parse(bodyText) as Record<string, unknown>;
    const action = requireText(body.action, 40);
    loginRequest = ['password', 'badge', 'exceptional'].includes(action);
    const ref = Deno.env.get('HML_PROJECT_REF');
    if (Deno.env.get('APP_ENV') !== 'HML' || !ref || url !== `https://${ref}.supabase.co`)
      throw new Error('CONFIGURATION');
    const admin = createClient(url, serviceKey, options);
    if (['password', 'badge', 'exceptional'].includes(action)) {
      // Separate server-owned buckets prevent PIN abuse from locking ordinary accounts.
      // Global limits also stop distributed PIN guessing without trusting forwarded IP headers.
      const { data: permitted, error: limitError } = await admin.rpc('auth_rate_limit', {
        p_bucket: `login:${action}`,
        p_limit: action === 'exceptional' ? 5 : 60,
        p_seconds: action === 'exceptional' ? 300 : 60,
      });
      if (limitError) throw limitError;
      if (!permitted) throw new Error('RATE_LIMITED');
      const value =
        action === 'badge'
          ? await hashToken(requireText(body.token, 64))
          : action === 'password'
            ? requireText(body.username, 64)
            : requireText(body.identity, 32);
      const { data: candidate, error } = await admin.rpc('auth_candidate', {
        p_kind: action,
        p_value: value,
      });
      if (error) throw error;
      if (!candidate) throw new Error('AUTH_FAILED');
      const authClient = createClient(url, anon, options);
      let session;
      if (action === 'password') {
        const response = await authClient.auth.signInWithPassword({
          email: candidate.email,
          password: requireText(body.password, 128),
        });
        if (response.error) throw new Error('AUTH_FAILED');
        session = response.data.session;
      } else {
        if (action === 'exceptional' && !(await verifyPin(requirePin(body.pin), candidate.proof)))
          throw new Error('AUTH_FAILED');
        const link = await admin.auth.admin.generateLink({
          type: 'magiclink',
          email: candidate.email,
        });
        if (link.error) throw new Error('AUTH_FAILED');
        const response = await authClient.auth.verifyOtp({
          token_hash: link.data.properties.hashed_token,
          type: 'magiclink',
        });
        if (response.error) throw new Error('AUTH_FAILED');
        session = response.data.session;
      }
      if (!session) throw new Error('AUTH_FAILED');
      const registration = await admin.rpc('register_session', {
        p_profile: candidate.id,
        p_session: sessionId(session.access_token),
        p_kind: action,
        p_proof: candidate.proof,
      });
      if (registration.error || !registration.data) {
        await authClient.auth.signOut();
        throw new Error('AUTH_FAILED');
      }
      return respond({
        session: { access_token: session.access_token, refresh_token: session.refresh_token },
      });
    }
    const authorization = request.headers.get('authorization') || '';
    if (!authorization.startsWith('Bearer ')) throw new Error('FORBIDDEN');
    const user = createClient(url, anon, {
      ...options,
      global: { headers: { Authorization: authorization } },
    });
    const verified = await user.auth.getUser(authorization.slice(7));
    if (verified.error || !verified.data.user) throw new Error('FORBIDDEN');
    const { data: actor, error: actorError } = await user.rpc('my_profile');
    if (actorError || actor?.role !== 'ADMIN' || !actor.active) throw new Error('FORBIDDEN');
    if (!uuid(body.operation)) throw new Error('INVALID_INPUT');
    if (action === 'save_user') {
      const data = body.data as Record<string, unknown>;
      if (
        !data ||
        !['ADMIN', 'STOCK_CONTROLLER', 'IT'].includes(String(data.role)) ||
        typeof data.active !== 'boolean'
      )
        throw new Error('INVALID_INPUT');
      const clean = {
        username: requireText(data.username, 64),
        display_name: requireText(data.display_name, 120),
        role: data.role,
        active: data.active,
      };
      if (!/^[a-zA-Z0-9._-]{3,64}$/.test(clean.username)) throw new Error('INVALID_INPUT');
      const existing = await user.rpc('operation_result', { p_operation: body.operation });
      if (existing.error) throw existing.error;
      if (existing.data) return respond({ result: existing.data });
      let authId: string | null = null;
      if (!body.id) {
        const password = requireNewPassword(body.password);
        // Operation-based opaque technical identity makes interrupted provisioning resumable.
        const email = `${body.operation}@identity.estoque.invalid`;
        const lookup = await admin.rpc('provisioned_auth_id', { p_email: email });
        if (lookup.error) throw lookup.error;
        authId = lookup.data;
        if (!authId) {
          const created = await admin.auth.admin.createUser({
            email,
            password,
            email_confirm: true,
          });
          if (created.error) throw created.error;
          authId = created.data.user.id;
        }
      } else if (!uuid(body.id)) throw new Error('INVALID_INPUT');
      const result = await user.rpc('save_profile', {
        p_id: body.id || null,
        p_auth_user_id: authId,
        p_version: body.version || null,
        p_data: clean,
        p_operation: body.operation,
      });
      if (result.error) throw result.error;
      return respond({ result: result.data });
    }
    if (action === 'badge_regenerate') {
      if (!uuid(body.id)) throw new Error('INVALID_INPUT');
      const token = randomToken();
      const result = await admin.rpc('regenerate_badge', {
        p_id: body.id,
        p_hash: await hashToken(token),
        p_operation: body.operation,
        p_actor_session: sessionId(authorization.slice(7)),
      });
      if (result.error) throw result.error;
      return respond({ token });
    }
    if (action === 'exceptional_save') {
      if (
        typeof body.monitoring_enabled !== 'boolean' ||
        typeof body.third_party_enabled !== 'boolean'
      )
        throw new Error('INVALID_INPUT');
      const result = await admin.rpc('configure_exceptional', {
        p_actor_session: sessionId(authorization.slice(7)),
        p_monitoring: body.monitoring_enabled,
        p_third_party: body.third_party_enabled,
        p_pin_hash: body.pin ? await hashPin(requirePin(body.pin)) : null,
        p_version: body.version,
        p_operation: body.operation,
      });
      if (result.error) throw result.error;
      return respond({ result: result.data });
    }
    if (action === 'password_reset') {
      if (!uuid(body.id)) throw new Error('INVALID_INPUT');
      const password = requireNewPassword(body.password);
      const target = await user
        .from('profiles')
        .select('auth_user_id,role')
        .eq('id', body.id)
        .single();
      if (target.error || !['ADMIN', 'STOCK_CONTROLLER', 'IT'].includes(target.data.role))
        throw new Error('NOT_FOUND');
      const start = await admin.rpc('audit_password_reset', {
        p_id: body.id,
        p_operation: body.operation,
        p_stage: 'requested',
        p_actor_session: sessionId(authorization.slice(7)),
      });
      if (start.error) throw start.error;
      const changed = await admin.auth.admin.updateUserById(target.data.auth_user_id, { password });
      if (changed.error) throw changed.error;
      const end = await admin.rpc('audit_password_reset', {
        p_id: body.id,
        p_operation: body.operation,
        p_stage: 'completed',
        p_actor_session: sessionId(authorization.slice(7)),
      });
      if (end.error) throw end.error;
      return respond({ completed: true });
    }
    throw new Error('INVALID_INPUT');
  } catch (error) {
    const internalCode = businessCode(error) || 'UNEXPECTED';
    const code = loginRequest && internalCode !== 'RATE_LIMITED' ? 'AUTH_FAILED' : internalCode;
    console.error(JSON.stringify({ correlation, code: internalCode }));
    return respond(
      { code, correlation },
      code === 'FORBIDDEN'
        ? 403
        : code === 'RATE_LIMITED'
          ? 429
          : code === 'UNEXPECTED'
            ? 500
            : 400,
    );
  }
}
Deno.serve(handler);
