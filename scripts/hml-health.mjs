// Native Auth health endpoint only. No database writes, login or custom public RPC.
export const HML_URL = 'https://xghrambcwigdemxancxr.supabase.co';
export async function checkHmlHealth(env, fetcher = fetch) {
  if (env.APP_ENV !== 'HML' || env.HML_SUPABASE_URL !== HML_URL)
    throw new Error('Keep-alive restrito ao projeto HML autorizado.');
  const key = env.HML_SUPABASE_PUBLISHABLE_KEY;
  if (!key || !/^sb_publishable_[A-Za-z0-9_-]+$/.test(key))
    throw new Error(
      'Configure somente a publishable key HML; chaves privilegiadas não são aceitas.',
    );
  let response;
  try {
    response = await fetcher(`${HML_URL}/auth/v1/health`, {
      method: 'GET',
      headers: { apikey: key },
      redirect: 'error',
      signal: AbortSignal.timeout(15000),
    });
  } catch {
    throw new Error('Health-check HML falhou: rede, timeout ou redirecionamento.');
  }
  if (response.status !== 200) throw new Error(`Health-check HML falhou: HTTP ${response.status}.`);
  let body;
  try {
    body = await response.json();
  } catch {
    throw new Error('Health-check HML retornou JSON inválido.');
  }
  if (body?.name !== 'GoTrue' || typeof body.version !== 'string' || !body.version.trim())
    throw new Error('Health-check HML retornou um contrato inesperado.');
  return 'HML: Auth health respondeu HTTP 200 com contrato válido.';
}
