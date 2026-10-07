import { beforeEach, expect, it, vi } from 'vitest';
const mocks = vi.hoisted(() => ({ rpc: vi.fn(), createUser: vi.fn() }));
vi.mock('@supabase/supabase-js', () => ({
  createClient: () => ({ rpc: mocks.rpc, auth: { admin: { createUser: mocks.createUser } } }),
}));
beforeEach(() => {
  vi.resetModules();
  vi.clearAllMocks();
  vi.stubEnv('APP_ENV', 'HML');
  vi.stubEnv('HML_PROJECT_REF', 'xghrambcwigdemxancxr');
  vi.stubEnv('SUPABASE_URL', 'https://xghrambcwigdemxancxr.supabase.co');
  vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', 'server-test-key');
  for (const name of ['HML_ADMIN_PASSWORD', 'HML_CONTROLLER_PASSWORD', 'HML_IT_PASSWORD'])
    vi.stubEnv(name, 'abcdef1!');
  vi.spyOn(console, 'log').mockImplementation(() => {});
  mocks.createUser.mockResolvedValue({ data: { user: { id: 'new-test-identity' } }, error: null });
});
it('bootstrap recusa senha fraca antes de provisionar', async () => {
  mocks.rpc.mockResolvedValue({ data: null, error: null });
  vi.stubEnv('HML_ADMIN_PASSWORD', 'abcdefgh');
  await expect(import('../scripts/bootstrap-hml.mjs')).rejects.toThrow(
    'pelo menos uma letra, um número',
  );
  expect(mocks.createUser).not.toHaveBeenCalled();
});
it('bootstrap valida senhas novas inclusive as identidades excepcionais', async () => {
  mocks.rpc.mockResolvedValue({ data: null, error: null });
  await import('../scripts/bootstrap-hml.mjs');
  expect(mocks.createUser).toHaveBeenCalledTimes(5);
  const { validNewPassword } = await import('../supabase/functions/_shared/password-policy.ts');
  for (const [args] of mocks.createUser.mock.calls)
    expect(validNewPassword(args.password)).toBe(true);
});
it('bootstrap não redefine nem revalida senha de identidade existente', async () => {
  mocks.rpc.mockImplementation(async (name) => ({
    data: name === 'provisioned_auth_id' ? 'existing-id' : null,
    error: null,
  }));
  vi.stubEnv('HML_ADMIN_PASSWORD', 'legacy');
  vi.stubEnv('HML_CONTROLLER_PASSWORD', '');
  vi.stubEnv('HML_IT_PASSWORD', '');
  await import('../scripts/bootstrap-hml.mjs');
  expect(mocks.createUser).not.toHaveBeenCalled();
});
