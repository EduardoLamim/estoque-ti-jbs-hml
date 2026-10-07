const url = process.env.VITE_SUPABASE_URL;
const key = process.env.VITE_SUPABASE_PUBLISHABLE_KEY;
if (url !== 'https://xghrambcwigdemxancxr.supabase.co' || !key)
  throw new Error('Configure a conexão pública do HML aprovado.');
for (const [name, path, method] of [
  ['RPC da fundação', '/rest/v1/rpc/my_profile', 'POST'],
  ['Edge Function', '/functions/v1/foundation', 'GET'],
]) {
  const result = await fetch(url + path, {
    method,
    headers: { apikey: key, 'Content-Type': 'application/json' },
    ...(method === 'POST' ? { body: '{}' } : {}),
  });
  console.log(`${name}: HTTP ${result.status}`);
  if (result.status === 404) console.log('Ainda não implantado no projeto HML.');
}
