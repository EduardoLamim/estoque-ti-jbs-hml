import { createClient } from '@supabase/supabase-js';
import type {
  Entity,
  ExceptionalSettings,
  FormValues,
  MasterRecord,
  Profile,
} from '../domain/model';
import { businessCode, messages } from '../../supabase/functions/_shared/errors';
const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string | undefined;
const sessionStorageKey = 'estoque.auth.session';
export const configured = Boolean(url && key && import.meta.env.VITE_APP_ENV === 'HML');
export const client = configured
  ? createClient(url!, key!, {
      auth: {
        storageKey: sessionStorageKey,
        storage: window.sessionStorage,
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: false,
      },
    })
  : null;
export class AppError extends Error {
  constructor(
    public code: string,
    public correlation = `ERR-${crypto.randomUUID()}`,
  ) {
    super(
      messages[code] ||
        `Não foi possível concluir a operação. Tente novamente. Se o problema continuar, entre em contato com a TI. Código: ${correlation}`,
    );
  }
}
export const userError = (error: unknown) =>
  error instanceof AppError ? error : new AppError(businessCode(error) || 'UNEXPECTED');
function backend() {
  if (!client) throw new AppError('CONFIGURATION');
  return client;
}
async function rpc<T>(name: string, args?: Record<string, unknown>): Promise<T> {
  const result = await backend().rpc(name, args);
  if (result.error) {
    const error = userError(result.error);
    console.error(JSON.stringify({ correlation: error.correlation, code: error.code, rpc: name }));
    throw error;
  }
  return result.data as T;
}
async function edge<T>(body: Record<string, unknown>): Promise<T> {
  const { data, error } = await backend().functions.invoke('foundation', { body });
  if (error) {
    let code = 'UNCERTAIN';
    let correlation: string | undefined;
    if ('context' in error && error.context instanceof Response) {
      try {
        const value = (await error.context.json()) as { code?: string; correlation?: string };
        code = value.code || code;
        correlation = value.correlation;
      } catch {
        /* sanitized fallback */
      }
    }
    throw new AppError(code, correlation);
  }
  return data as T;
}
async function list<T>(table: string): Promise<T[]> {
  const all: T[] = [];
  for (let from = 0; ; from += 500) {
    const result = await backend()
      .from(table)
      .select('*')
      .order('id')
      .range(from, from + 499);
    if (result.error) throw userError(result.error);
    all.push(...(result.data as T[]));
    if (result.data.length < 500) return all;
  }
}
export const api = {
  async login(body: Record<string, unknown>) {
    const result = await edge<{ session: { access_token: string; refresh_token: string } }>(body);
    const session = await backend().auth.setSession(result.session);
    if (session.error) throw new AppError('AUTH_FAILED');
  },
  profile: () => rpc<Profile | null>('my_profile'),
  touch: () => rpc<void>('touch_session'),
  async logout() {
    try {
      await rpc('end_session');
    } finally {
      try {
        await backend().auth.signOut({ scope: 'local' });
      } finally {
        // Local logout must also work when the Auth endpoint is unreachable.
        [
          sessionStorageKey,
          `${sessionStorageKey}-user`,
          `${sessionStorageKey}-code-verifier`,
        ].forEach((name) => sessionStorage.removeItem(name));
      }
    }
  },
  list: (entity: Entity) => list<MasterRecord>(entity),
  users: async () =>
    (await list<Profile>('profiles')).filter(
      (p) => !['MONITORING', 'THIRD_PARTY'].includes(p.role),
    ),
  save: (entity: Entity, record: MasterRecord | null, data: FormValues, operation: string) =>
    rpc<MasterRecord>('save_master', {
      p_entity: entity,
      p_id: record?.id || null,
      p_version: record?.version || null,
      p_data: data,
      p_operation: operation,
    }),
  operation: (id: string) => rpc<unknown>('operation_result', { p_operation: id }),
  saveUser: (record: Profile | null, data: FormValues, password: string, operation: string) =>
    edge<{ result: Profile }>({
      action: 'save_user',
      id: record?.id,
      version: record?.version,
      data,
      password,
      operation,
    }),
  badge: (id: string, operation: string) =>
    edge<{ token: string }>({ action: 'badge_regenerate', id, operation }),
  resetPassword: (id: string, password: string) =>
    edge({ action: 'password_reset', id, password, operation: crypto.randomUUID() }),
  settings: () => rpc<ExceptionalSettings>('get_exceptional_settings'),
  saveSettings: (settings: ExceptionalSettings, pin: string, operation: string) =>
    edge({ action: 'exceptional_save', ...settings, pin, operation }),
};
