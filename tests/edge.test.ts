import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { hashPin } from '../supabase/functions/_shared/security';
const mocks = vi.hoisted(() => ({
  adminRpc: vi.fn(),
  userRpc: vi.fn(),
  signIn: vi.fn(),
  generateLink: vi.fn(),
  verifyOtp: vi.fn(),
  getUser: vi.fn(),
  signOut: vi.fn(),
  log: vi.fn(),
  createUser: vi.fn(),
  updateUser: vi.fn(),
  target: vi.fn(),
}));
vi.mock('npm:@supabase/supabase-js@2.117.2', () => ({
  createClient: (_url: string, key: string, options?: { global?: unknown }) =>
    key === 'server-only-test-key'
      ? {
          rpc: mocks.adminRpc,
          auth: {
            admin: {
              generateLink: mocks.generateLink,
              createUser: mocks.createUser,
              updateUserById: mocks.updateUser,
            },
          },
        }
      : options?.global
        ? {
            rpc: mocks.userRpc,
            auth: { getUser: mocks.getUser },
            from: () => ({ select: () => ({ eq: () => ({ single: mocks.target }) }) }),
          }
        : {
            auth: {
              signInWithPassword: mocks.signIn,
              verifyOtp: mocks.verifyOtp,
              signOut: mocks.signOut,
            },
          },
}));
let handler: (req: Request) => Promise<Response>;
let pinHash: string;
const token = `eyJhbGciOiJIUzI1NiJ9.${Buffer.from(JSON.stringify({ session_id: '10000000-0000-4000-8000-000000000003' })).toString('base64url')}.test`;
const session = { access_token: token, refresh_token: 'test-refresh-only' };
beforeAll(async () => {
  const env: Record<string, string> = {
    SUPABASE_URL: 'https://hml-test.supabase.co',
    SUPABASE_ANON_KEY: 'public-test-key',
    SUPABASE_SERVICE_ROLE_KEY: 'server-only-test-key',
    APP_ENV: 'HML',
    HML_PROJECT_REF: 'hml-test',
    ALLOWED_ORIGINS: 'http://localhost:5173',
  };
  vi.stubGlobal('Deno', { env: { get: (key: string) => env[key] }, serve: vi.fn() });
  vi.spyOn(console, 'error').mockImplementation(mocks.log);
  const entry = '../supabase/functions/foundation/index';
  handler = (await import(entry)).handler;
  pinHash = await hashPin('468275');
});
beforeEach(() => {
  vi.clearAllMocks();
  mocks.adminRpc.mockImplementation(async (name: string) => ({
    error: null,
    data:
      name === 'auth_rate_limit' || name === 'register_session'
        ? true
        : name === 'auth_candidate'
          ? { id: 'test-profile', email: 'opaque@identity.invalid', proof: pinHash }
          : null,
  }));
  mocks.signIn.mockResolvedValue({ data: { session }, error: null });
  mocks.generateLink.mockResolvedValue({
    data: { properties: { hashed_token: 'one-time-test-token' } },
    error: null,
  });
  mocks.verifyOtp.mockResolvedValue({ data: { session }, error: null });
  mocks.signOut.mockResolvedValue({ error: null });
  mocks.getUser.mockResolvedValue({ data: { user: { id: 'admin-auth' } }, error: null });
  mocks.userRpc.mockImplementation(async (name: string) => ({
    data: name === 'my_profile' ? { role: 'ADMIN', active: true } : null,
    error: null,
  }));
  mocks.createUser.mockResolvedValue({ data: { user: { id: 'new-auth' } }, error: null });
  mocks.updateUser.mockResolvedValue({ data: {}, error: null });
  mocks.target.mockResolvedValue({
    data: { auth_user_id: 'target-auth', role: 'IT' },
    error: null,
  });
});
const request = (body: unknown, headers: Record<string, string> = {}) =>
  handler(
    new Request('https://hml-test.supabase.co/functions/v1/foundation', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...headers },
      body: JSON.stringify(body),
    }),
  );
describe('Edge boundary with mocked Supabase Auth transport', () => {
  for (const action of ['save_user', 'password_reset']) {
    it.each([
      ['curta', 'Abc12!x'],
      ['sem letra', '1234567!'],
      ['sem número', 'abcdefgh!'],
      ['sem especial', 'abcdefg1'],
    ])(`${action}: backend rejeita %s sem chamar Auth ou auditar senha`, async (_, password) => {
      const response = await request(
        {
          action,
          operation: crypto.randomUUID(),
          ...(action === 'password_reset' ? { id: crypto.randomUUID() } : {}),
          data: { username: 'teste.hml', display_name: 'Teste', role: 'IT', active: true },
          password,
        },
        { Authorization: `Bearer ${token}` },
      );
      expect(response.status).toBe(400);
      expect((await response.json()).code).toBe('PASSWORD_POLICY');
      expect(mocks.createUser).not.toHaveBeenCalled();
      expect(mocks.updateUser).not.toHaveBeenCalled();
      expect(mocks.adminRpc).not.toHaveBeenCalledWith('audit_password_reset', expect.anything());
      expect(JSON.stringify(mocks.log.mock.calls)).not.toContain(password);
    });
    it(`${action}: aceita oito caracteres com letra, número e especial`, async () => {
      const response = await request(
        {
          action,
          operation: crypto.randomUUID(),
          ...(action === 'password_reset' ? { id: crypto.randomUUID() } : {}),
          data: { username: 'teste.hml', display_name: 'Teste', role: 'IT', active: true },
          password: 'abcdef1!',
        },
        { Authorization: `Bearer ${token}` },
      );
      expect(response.status).toBe(200);
      expect(action === 'save_user' ? mocks.createUser : mocks.updateUser).toHaveBeenCalledTimes(1);
      expect(JSON.stringify(mocks.log.mock.calls)).not.toContain('abcdef1!');
    });
  }
  it('editar perfil não redefine senha nem aplica a política retroativamente', async () => {
    const response = await request(
      {
        action: 'save_user',
        id: crypto.randomUUID(),
        operation: crypto.randomUUID(),
        version: 1,
        data: { username: 'teste.hml', display_name: 'Teste', role: 'IT', active: true },
        password: '',
      },
      { Authorization: `Bearer ${token}` },
    );
    expect(response.status).toBe(200);
    expect(mocks.createUser).not.toHaveBeenCalled();
    expect(mocks.updateUser).not.toHaveBeenCalled();
  });
  it('login válido troca username no servidor e retorna somente sessão', async () => {
    const response = await request({
      action: 'password',
      username: 'admin.hml',
      password: 'test-only-password',
    });
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ session });
    expect(mocks.signIn).toHaveBeenCalledWith({
      email: 'opaque@identity.invalid',
      password: 'test-only-password',
    });
  });
  it('senha incorreta não expõe erro interno', async () => {
    mocks.signIn.mockResolvedValue({
      data: { session: null },
      error: { message: 'sensitive provider detail' },
    });
    const response = await request({
      action: 'password',
      username: 'admin.hml',
      password: 'wrong',
    });
    expect((await response.json()).code).toBe('AUTH_FAILED');
    expect(JSON.stringify(mocks.log.mock.calls)).not.toContain('sensitive');
  });
  it('usuário inativo/inexistente não chega ao provedor de Auth', async () => {
    mocks.adminRpc.mockImplementation(async (name: string) => ({
      data: name === 'auth_rate_limit' ? true : null,
      error: null,
    }));
    expect(
      (
        await (
          await request({ action: 'password', username: 'inactive', password: 'wrong' })
        ).json()
      ).code,
    ).toBe('AUTH_FAILED');
    expect(mocks.signIn).not.toHaveBeenCalled();
  });
  it('QR válido é validado por hash, convertido em OTP e sessão registrada', async () => {
    const response = await request({ action: 'badge', token: 'a'.repeat(64) });
    expect(response.status).toBe(200);
    expect(mocks.verifyOtp).toHaveBeenCalledWith({
      token_hash: 'one-time-test-token',
      type: 'magiclink',
    });
    expect(mocks.adminRpc).toHaveBeenCalledWith(
      'register_session',
      expect.objectContaining({ p_kind: 'badge' }),
    );
  });
  it('QR inválido/antigo não gera OTP', async () => {
    mocks.adminRpc.mockImplementation(async (name: string) => ({
      data: name === 'auth_rate_limit' ? true : null,
      error: null,
    }));
    expect((await (await request({ action: 'badge', token: 'b'.repeat(64) })).json()).code).toBe(
      'AUTH_FAILED',
    );
    expect(mocks.generateLink).not.toHaveBeenCalled();
  });
  it('revogação entre validar e emitir sessão é revalidada', async () => {
    mocks.adminRpc.mockImplementation(async (name: string) => ({
      data:
        name === 'auth_rate_limit'
          ? true
          : name === 'auth_candidate'
            ? { id: 'test', email: 'test@invalid', proof: 'hash' }
            : false,
      error: null,
    }));
    expect((await (await request({ action: 'badge', token: 'a'.repeat(64) })).json()).code).toBe(
      'AUTH_FAILED',
    );
    expect(mocks.signOut).toHaveBeenCalled();
  });
  it('PIN correto estabelece sessão da identidade escolhida', async () => {
    const response = await request({
      action: 'exceptional',
      identity: 'MONITORING',
      pin: '468275',
    });
    expect(response.status).toBe(200);
    expect(mocks.adminRpc).toHaveBeenCalledWith('auth_candidate', {
      p_kind: 'exceptional',
      p_value: 'MONITORING',
    });
    expect(JSON.stringify(mocks.log.mock.calls)).not.toContain('468275');
  });
  it('PIN incorreto não emite sessão', async () => {
    expect(
      (
        await (
          await request({ action: 'exceptional', identity: 'THIRD_PARTY', pin: '468276' })
        ).json()
      ).code,
    ).toBe('AUTH_FAILED');
    expect(mocks.generateLink).not.toHaveBeenCalled();
  });
  it('rate limit bloqueia antes de consultar credenciais', async () => {
    mocks.adminRpc.mockResolvedValue({ data: false, error: null });
    const response = await request({ action: 'exceptional', identity: 'MONITORING', pin: 'wrong' });
    expect(response.status).toBe(429);
    expect(mocks.adminRpc).toHaveBeenCalledTimes(1);
  });
  it('Admin é verificado por sessão real e perfil server-side', async () => {
    mocks.userRpc.mockResolvedValue({
      data: { role: 'STOCK_CONTROLLER', active: true },
      error: null,
    });
    const response = await request(
      { action: 'badge_regenerate', id: crypto.randomUUID(), operation: crypto.randomUUID() },
      { Authorization: `Bearer ${token}` },
    );
    expect(response.status).toBe(403);
    expect(mocks.getUser).toHaveBeenCalledWith(token);
  });
  it('origem não autorizada é rejeitada antes do Auth', async () => {
    expect(
      (await request({ action: 'password' }, { Origin: 'https://untrusted.invalid' })).status,
    ).toBe(403);
    expect(mocks.adminRpc).not.toHaveBeenCalled();
  });
});
