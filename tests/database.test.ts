import { PGlite } from '@electric-sql/pglite';
import { readFileSync, readdirSync } from 'node:fs';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
const db = new PGlite();
const ids = {
  admin: '10000000-0000-4000-8000-000000000001',
  controller: '10000000-0000-4000-8000-000000000002',
  it: '10000000-0000-4000-8000-000000000003',
  monitoring: '10000000-0000-4000-8000-000000000004',
  third: '10000000-0000-4000-8000-000000000005',
};
const sessions: Record<string, string> = {};
const profiles: Record<string, string> = {};
async function sql<T = Record<string, unknown>>(query: string, params: unknown[] = []) {
  return (await db.query<T>(query, params)).rows;
}
async function actor(name: keyof typeof ids) {
  await db.exec('reset role');
  await sql("select set_config('request.jwt.claims',$1,false)", [
    JSON.stringify({ sub: ids[name], session_id: sessions[name] }),
  ]);
  await db.exec('set role authenticated');
}
async function save(
  entity: string,
  data: Record<string, unknown>,
  id: string | null = null,
  version: number | null = null,
  operation = crypto.randomUUID(),
): Promise<Record<string, unknown>> {
  const rows = await sql<{ result: Record<string, unknown> }>(
    'select public.save_master($1,$2,$3,$4,$5) result',
    [entity, id, version, JSON.stringify(data), operation],
  );
  return rows[0].result;
}
beforeAll(async () => {
  await db.exec(
    `create role anon; create role authenticated; create role service_role bypassrls; create schema auth; create table auth.users(id uuid primary key,email text); create function auth.jwt() returns jsonb language sql stable as $$ select coalesce(nullif(current_setting('request.jwt.claims',true),''),'{}')::jsonb $$; create function auth.uid() returns uuid language sql stable as $$ select (auth.jwt()->>'sub')::uuid $$; grant usage on schema auth to authenticated,anon,service_role; grant execute on all functions in schema auth to authenticated,anon,service_role;`,
  );
  for (const file of readdirSync('supabase/migrations').sort())
    await db.exec(readFileSync(`supabase/migrations/${file}`, 'utf8'));
  for (const [i, [name, id]] of Object.entries(ids).entries()) {
    await sql('insert into auth.users values($1,$2)', [id, `${name}@test.invalid`]);
    const role = ['ADMIN', 'STOCK_CONTROLLER', 'IT', 'MONITORING', 'THIRD_PARTY'][i];
    const p = await sql<{ id: string }>('select public.bootstrap_identity($1,$2,$2,$3) id', [
      id,
      name === 'it' ? 'it_user' : name,
      role,
    ]);
    profiles[name] = p[0].id;
    sessions[name] = crypto.randomUUID();
  }
  await sql('select public.bootstrap_pin($1)', [
    'pbkdf2:600000:' + 'a'.repeat(32) + ':' + 'b'.repeat(64),
  ]);
  for (const name of Object.keys(ids))
    await sql('insert into private.app_sessions(session_id,profile_id) values($1,$2)', [
      sessions[name],
      profiles[name],
    ]);
}, 30000);
afterAll(async () => {
  await db.close();
});
describe.sequential('Migrations reais em PostgreSQL embarcado: autorização e integridade', () => {
  let root: Record<string, unknown>;
  let child: Record<string, unknown>;
  let category: Record<string, unknown>;
  it('seed HML pode ser reaplicado sem duplicar cadastros', async () => {
    await db.exec(readFileSync('supabase/seed.sql', 'utf8'));
    const before = await sql('select count(*) n from public.audit_events');
    await db.exec(readFileSync('supabase/seed.sql', 'utf8'));
    expect(await sql('select count(*) n from public.audit_events')).toEqual(before);
    expect(await sql("select * from public.stock_positions where name like '%HML%'")).toHaveLength(
      3,
    );
  });
  it('habilita RLS em todas as tabelas da aplicação e schemas privados', async () => {
    const tables = await sql<{ relrowsecurity: boolean }>(
      "select relrowsecurity from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname in ('public','private') and c.relkind='r'",
    );
    expect(tables.length).toBeGreaterThan(10);
    expect(tables.every((t) => t.relrowsecurity)).toBe(true);
  });
  it('Admin cria raiz/filho com códigos únicos e aceita categoria sem preferencial', async () => {
    await actor('admin');
    root = await save('stock_positions', { name: 'Armário', active: true });
    child = await save('stock_positions', { name: 'Gaveta', parent_id: root.id, active: true });
    expect(root.code).toMatch(/^POS-\d{5}$/);
    expect(root.code).not.toBe(child.code);
    category = await save('categories', { name: 'Computação', active: true });
    expect(category.preferred_position_id).toBeNull();
  });
  it('operação repetida é idempotente', async () => {
    const operation = crypto.randomUUID();
    const a = await save('locations', { name: 'Gate', active: true }, null, null, operation);
    const b = await save('locations', { name: 'Gate', active: true }, null, null, operation);
    expect(a.id).toBe(b.id);
  });
  it('salvar sem mudança não gera evento nem aumenta versão', async () => {
    const before = await sql('select count(*) n from public.audit_events');
    const updated = await save(
      'categories',
      { name: 'Computação', active: true },
      String(category.id),
      1,
    );
    const after = await sql('select count(*) n from public.audit_events');
    expect(after).toEqual(before);
    expect(updated.version).toBe(1);
  });
  it('valida triagem no banco, não somente na UI', async () => {
    await expect(save('categories', { name: 'Inválida', triage_on_create: true })).rejects.toThrow(
      'TRIAGE_REQUIRED',
    );
  });
  it('registra old/new e bloqueia versão obsoleta', async () => {
    category = await save(
      'categories',
      { name: 'Computação e rede', preferred_position_id: child.id },
      String(category.id),
      1,
    );
    const events = await sql<{ old_data: { name: string }; new_data: { name: string } }>(
      'select old_data,new_data from public.audit_events where entity_id=$1 order by id desc limit 1',
      [category.id],
    );
    expect(events[0].old_data.name).toBe('Computação');
    expect(events[0].new_data.name).toBe('Computação e rede');
    await expect(save('categories', { name: 'Antiga' }, String(category.id), 1)).rejects.toThrow(
      'STALE_VERSION',
    );
  });
  it('bloqueia desativação de POS referenciada e pai com filho ativo', async () => {
    await expect(save('stock_positions', { active: false }, String(child.id), 1)).rejects.toThrow(
      'POSITION_REFERENCED',
    );
    await expect(save('stock_positions', { active: false }, String(root.id), 1)).rejects.toThrow(
      'POSITION_REFERENCED',
    );
  });
  it('bloqueia ciclo e pai inexistente', async () => {
    await expect(
      save('stock_positions', { parent_id: child.id }, String(root.id), 1),
    ).rejects.toThrow('POSITION_CYCLE');
    await expect(
      save('stock_positions', { name: 'Sem pai', parent_id: crypto.randomUUID() }),
    ).rejects.toThrow('INVALID_PARENT');
  });
  it('POS inativa não pode ser selecionada', async () => {
    const inactive = await save('stock_positions', { name: 'Inativa', active: false });
    await expect(
      save('categories', { name: 'Inválida', preferred_position_id: inactive.id }),
    ).rejects.toThrow('POSITION_INACTIVE');
  });
  it('normaliza fabricante e CNPJ com unicidade no banco', async () => {
    await save('manufacturers', { name: ' Fabricante teste ', active: true });
    await expect(save('manufacturers', { name: 'fabricante TESTE', active: true })).rejects.toThrow(
      /unique/,
    );
    await save('suppliers', {
      name: 'Empresa teste',
      cnpj: '12.ABC.345/01DE-35',
      address: 'Rua HML',
      active: true,
    });
    await expect(
      save('suppliers', { name: 'Outra', cnpj: '12ABC34501DE35', address: 'Rua HML' }),
    ).rejects.toThrow(/unique/);
    await expect(
      save('suppliers', { name: 'Outra', cnpj: '11222333000100', address: 'Rua HML' }),
    ).rejects.toThrow(/check/);
  });
  it('proíbe escrita direta, alteração de código e mutação de auditoria', async () => {
    await expect(sql("update public.stock_positions set code='POS-99999'")).rejects.toThrow(
      /permission/,
    );
    await expect(sql('delete from public.audit_events')).rejects.toThrow(/permission/);
    await expect(sql("update public.audit_events set event_type='fake'")).rejects.toThrow(
      /permission/,
    );
    await expect(
      save('stock_positions', { code: 'POS-99999' }, String(root.id), 1),
    ).rejects.toThrow('INVALID_INPUT');
  });
  it('protege o último Admin ativo', async () => {
    await expect(
      sql('select public.save_profile($1,null,1,$2,$3)', [
        profiles.admin,
        JSON.stringify({ username: 'admin', display_name: 'admin', role: 'IT', active: true }),
        crypto.randomUUID(),
      ]),
    ).rejects.toThrow('LAST_ADMIN');
    await expect(
      sql('select public.save_profile($1,null,1,$2,$3)', [
        profiles.admin,
        JSON.stringify({ username: 'admin', display_name: 'admin', role: 'ADMIN', active: false }),
        crypto.randomUUID(),
      ]),
    ).rejects.toThrow('LAST_ADMIN');
  });
  it('Admin cria e atualiza usuário com username único sem auditar credenciais', async () => {
    await db.exec('reset role');
    const authId = crypto.randomUUID();
    await sql('insert into auth.users values($1,$2)', [authId, 'opaque-new@test.invalid']);
    await actor('admin');
    const data = { username: 'novo.hml', display_name: 'Novo usuário', role: 'IT', active: true };
    const created = await sql<{ result: { id: string; version: number } }>(
      'select public.save_profile(null,$1,null,$2,$3) result',
      [authId, JSON.stringify(data), crypto.randomUUID()],
    );
    const updated = await sql<{ result: { active: boolean; version: number } }>(
      'select public.save_profile($1,null,1,$2,$3) result',
      [created[0].result.id, JSON.stringify({ ...data, active: false }), crypto.randomUUID()],
    );
    expect(updated[0].result).toMatchObject({ active: false, version: 2 });
    await expect(
      sql('select public.save_profile($1,null,2,$2,$3)', [
        created[0].result.id,
        JSON.stringify({ ...data, username: 'ADMIN' }),
        crypto.randomUUID(),
      ]),
    ).rejects.toThrow(/unique/);
    const events = JSON.stringify(
      await sql('select * from public.audit_events where entity_id=$1', [created[0].result.id]),
    );
    expect(events).toContain('status_changed');
    expect(events).not.toContain('opaque-new');
  });
  it('Controlador pode cadastrar, mas não administra usuários', async () => {
    await actor('controller');
    await save('locations', { name: 'Financeiro' });
    await expect(
      sql('select public.save_profile(null,null,null,$1,$2)', [
        JSON.stringify({ role: 'IT' }),
        crypto.randomUUID(),
      ]),
    ).rejects.toThrow('FORBIDDEN');
    const users = await sql('select * from public.profiles');
    expect(users).toHaveLength(1);
  });
  it('TI não grava master data por RPC nem API direta', async () => {
    await actor('it');
    await expect(save('locations', { name: 'Proibido' })).rejects.toThrow('FORBIDDEN');
    await expect(sql("insert into public.locations(name) values('Proibido')")).rejects.toThrow(
      /permission/,
    );
    expect(await sql('select * from public.audit_events')).toHaveLength(0);
  });
  it('identidades excepcionais são distintas e não leem Administração', async () => {
    for (const name of ['monitoring', 'third'] as const) {
      await actor(name);
      expect(await sql('select * from public.categories')).toHaveLength(0);
      await expect(save('locations', { name: 'Proibido' })).rejects.toThrow('FORBIDDEN');
      const me = await sql<{ p: { id: string } }>('select public.my_profile() p');
      expect(me[0].p.id).toBe(profiles[name]);
    }
    expect(profiles.monitoring).not.toBe(profiles.third);
  });
  it('anon não lê dados nem autentica por RPC interno', async () => {
    await db.exec('reset role;set role anon');
    await expect(sql('select * from public.categories')).rejects.toThrow(/permission/);
    await expect(sql("select public.auth_candidate('password','admin')")).rejects.toThrow(
      /permission/,
    );
    await expect(sql('select public.my_profile()')).rejects.toThrow(/permission/);
  });
  it('inatividade é bloqueada no servidor e heartbeat não ressuscita sessão', async () => {
    await db.exec('reset role');
    await sql(
      "update private.app_sessions set last_activity=now()-interval '11 minutes' where session_id=$1",
      [sessions.it],
    );
    await actor('it');
    await expect(sql('select public.touch_session()')).rejects.toThrow('SESSION_EXPIRED');
    expect(await sql('select * from public.locations')).toHaveLength(0);
  });
  it('logout revoga sessão no backend', async () => {
    await actor('controller');
    await sql('select public.end_session()');
    expect(await sql('select * from public.categories')).toHaveLength(0);
    await expect(save('locations', { name: 'Após logout' })).rejects.toThrow('SESSION_EXPIRED');
  });
  it('regenerar QR invalida hash antigo e auditoria não contém segredo', async () => {
    await actor('admin');
    const oldHash = 'c'.repeat(64),
      newHash = 'd'.repeat(64);
    await expect(
      sql('select public.regenerate_badge($1,$2,$3,$4)', [
        profiles.admin,
        oldHash,
        crypto.randomUUID(),
        sessions.admin,
      ]),
    ).rejects.toThrow(/permission/);
    await expect(
      sql('select public.audit_password_reset($1,$2,$3,$4)', [
        profiles.admin,
        crypto.randomUUID(),
        'completed',
        sessions.admin,
      ]),
    ).rejects.toThrow(/permission/);
    await db.exec('reset role');
    await sql('select public.regenerate_badge($1,$2,$3,$4)', [
      profiles.admin,
      oldHash,
      crypto.randomUUID(),
      sessions.admin,
    ]);
    await sql('select public.regenerate_badge($1,$2,$3,$4)', [
      profiles.admin,
      newHash,
      crypto.randomUUID(),
      sessions.admin,
    ]);
    await db.exec('reset role');
    expect(
      (await sql<{ c: unknown }>("select public.auth_candidate('badge',$1) c", [oldHash]))[0].c,
    ).toBeNull();
    expect(
      (await sql<{ c: unknown }>("select public.auth_candidate('badge',$1) c", [newHash]))[0].c,
    ).toBeTruthy();
    const audit = JSON.stringify(await sql('select * from public.audit_events'));
    expect(audit).not.toContain(oldHash);
    expect(audit).not.toContain(newHash);
  });
  it('registro de sessão revalida QR após regeneração concorrente', async () => {
    expect(
      (
        await sql<{ ok: boolean }>("select public.register_session($1,$2,'badge',$3) ok", [
          profiles.admin,
          crypto.randomUUID(),
          'c'.repeat(64),
        ])
      )[0].ok,
    ).toBe(false);
  });
  it('usuário inativo não é candidato nem opera com JWT antigo', async () => {
    await db.exec('reset role');
    await sql(
      'update private.app_sessions set last_activity=now(),revoked=false where session_id=$1',
      [sessions.it],
    );
    expect(
      (await sql<{ c: unknown }>("select public.auth_candidate('password','it_user') c"))[0].c,
    ).toBeTruthy();
    await sql('update public.profiles set active=false where id=$1', [profiles.it]);
    expect(
      (await sql<{ c: unknown }>("select public.auth_candidate('password','it_user') c"))[0].c,
    ).toBeNull();
    await actor('it');
    expect(await sql('select * from public.categories')).toHaveLength(0);
  });
  it('rate limit persiste tentativas e isola PIN de login normal', async () => {
    await db.exec('reset role');
    const results = [];
    for (let i = 0; i < 6; i++)
      results.push(
        (await sql<{ ok: boolean }>("select public.auth_rate_limit('pin-test',5,300) ok"))[0].ok,
      );
    expect(results).toEqual([true, true, true, true, true, false]);
    expect(
      (await sql<{ ok: boolean }>("select public.auth_rate_limit('normal-test',60,60) ok"))[0].ok,
    ).toBe(true);
  });
  it('PIN alterado nunca aparece em settings/auditoria', async () => {
    await db.exec('reset role');
    const hash = 'pbkdf2:600000:' + 'e'.repeat(32) + ':' + 'f'.repeat(64);
    await sql('select public.configure_exceptional($1,false,true,$2,1,$3)', [
      sessions.admin,
      hash,
      crypto.randomUUID(),
    ]);
    await actor('admin');
    const settings = await sql('select public.get_exceptional_settings()');
    expect(JSON.stringify(settings)).not.toContain(hash);
    expect(JSON.stringify(await sql('select * from public.audit_events'))).not.toContain(hash);
    await actor('monitoring');
    expect((await sql<{ p: unknown }>('select public.my_profile() p'))[0].p).toBeNull();
  });
});
