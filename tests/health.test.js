import { describe, expect, it, vi } from 'vitest';
import { checkHmlHealth, HML_URL } from '../scripts/hml-health.mjs';
const env = {
  APP_ENV: 'HML',
  HML_SUPABASE_URL: HML_URL,
  HML_SUPABASE_PUBLISHABLE_KEY: 'sb_publishable_test_only',
};
describe('Health HML somente leitura', () => {
  it('faz exatamente um GET no endpoint nativo sem Authorization ou body', async () => {
    const fetcher = vi
      .fn()
      .mockResolvedValue(
        new Response(JSON.stringify({ name: 'GoTrue', version: 'v2.test' }), { status: 200 }),
      );
    await expect(checkHmlHealth(env, fetcher)).resolves.toContain('HTTP 200');
    expect(fetcher).toHaveBeenCalledTimes(1);
    expect(fetcher).toHaveBeenCalledWith(`${HML_URL}/auth/v1/health`, {
      method: 'GET',
      headers: { apikey: env.HML_SUPABASE_PUBLISHABLE_KEY },
      redirect: 'error',
      signal: expect.any(AbortSignal),
    });
  });
  it.each([
    { ...env, APP_ENV: 'PRD' },
    { ...env, HML_SUPABASE_URL: 'https://other.supabase.co' },
    { ...env, HML_SUPABASE_PUBLISHABLE_KEY: 'sb_secret_not_allowed' },
    { ...env, HML_SUPABASE_PUBLISHABLE_KEY: '' },
  ])('recusa ambiente ou chave inadequados antes de acessar rede', async (configuration) => {
    const fetcher = vi.fn();
    await expect(checkHmlHealth(configuration, fetcher)).rejects.toThrow();
    expect(fetcher).not.toHaveBeenCalled();
  });
  it.each([401, 404, 503])('falha claramente com HTTP %i', async (status) => {
    await expect(
      checkHmlHealth(env, vi.fn().mockResolvedValue(new Response('', { status }))),
    ).rejects.toThrow(`HTTP ${status}`);
  });
  it.each(['not-json', '{}', '{"name":"other","version":"v1"}', '{"name":"GoTrue","version":""}'])(
    'recusa contrato inesperado',
    async (body) => {
      await expect(
        checkHmlHealth(env, vi.fn().mockResolvedValue(new Response(body))),
      ).rejects.toThrow();
    },
  );
  it('erro de transporte não imprime detalhes ou credenciais', async () => {
    await expect(
      checkHmlHealth(env, vi.fn().mockRejectedValue(new Error('sensitive-data'))),
    ).rejects.toThrow('Health-check HML falhou: rede, timeout ou redirecionamento.');
  });
});
