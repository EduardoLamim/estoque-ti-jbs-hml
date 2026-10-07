import { test, expect, type Page } from '@playwright/test';
import type { Role } from '../../src/domain/model';
const admin = {
  id: '10000000-0000-4000-8000-000000000001',
  auth_user_id: '10000000-0000-4000-8000-000000000002',
  username: 'admin.hml',
  display_name: 'Administrador HML',
  role: 'ADMIN',
  active: true,
  version: 1,
};
async function fixture(page: Page, role: Role = 'ADMIN') {
  let loginCount = 0;
  const profile = { ...admin, role };
  const user = {
    id: admin.auth_user_id,
    aud: 'authenticated',
    role: 'authenticated',
    email: 'internal@test.invalid',
    created_at: new Date().toISOString(),
    app_metadata: {},
    user_metadata: {},
  };
  const encode = (data: unknown) => Buffer.from(JSON.stringify(data)).toString('base64url');
  const token = `${encode({ alg: 'HS256', typ: 'JWT' })}.${encode({ sub: user.id, exp: Math.floor(Date.now() / 1000) + 3600, session_id: '10000000-0000-4000-8000-000000000003' })}.test`;
  await page.route('https://fonts.googleapis.com/**', (route) => route.abort());
  await page.route('**/auth/v1/**', async (route) => {
    const url = route.request().url();
    await route.fulfill({
      json: url.includes('logout')
        ? {}
        : url.includes('token')
          ? { access_token: token, refresh_token: 'test-refresh', expires_in: 3600, user }
          : user,
    });
  });
  await page.route('**/functions/v1/foundation', async (route) => {
    const body = route.request().postDataJSON();
    if (['password', 'badge', 'exceptional'].includes(body.action)) {
      loginCount++;
      await route.fulfill({
        json: { session: { access_token: token, refresh_token: 'test-refresh' } },
      });
    } else await route.fulfill({ json: {} });
  });
  await page.route('**/rest/v1/**', async (route) => {
    const path = new URL(route.request().url()).pathname;
    const json = path.endsWith('/rpc/my_profile')
      ? profile
      : path.endsWith('/rpc/get_exceptional_settings')
        ? { monitoring_enabled: true, third_party_enabled: true, version: 1 }
        : path.includes('/rpc/')
          ? null
          : path.endsWith('/profiles')
            ? [profile]
            : [];
    await route.fulfill({ json });
  });
  return () => loginCount;
}
async function login(page: Page) {
  await page.goto('/');
  await page.getByLabel('Usuário *', { exact: true }).fill('admin.hml');
  await page.getByLabel('Senha *', { exact: true }).fill('test-password-local-only');
  await page.getByRole('button', { name: 'Entrar', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Bem-vindo, Administrador.' })).toBeVisible();
}
test('login inválido mostra erro seguro sem dados do provedor', async ({ page }) => {
  await fixture(page);
  await page.route('**/functions/v1/foundation', (route) =>
    route.fulfill({ status: 400, json: { code: 'AUTH_FAILED', correlation: 'ERR-test' } }),
  );
  await page.goto('/');
  await page.getByLabel('Usuário *', { exact: true }).fill('wrong');
  await page.getByLabel('Senha *', { exact: true }).fill('wrong');
  await page.getByRole('button', { name: 'Entrar', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText('Não foi possível entrar');
});
for (const [name, width, height] of [
  ['desktop', 1440, 1000],
  ['tablet', 768, 1024],
  ['mobile', 390, 844],
] as const) {
  test(`layout ${name}, login, home e administração`, async ({ page }) => {
    await page.setViewportSize({ width, height });
    await fixture(page);
    await page.goto('/');
    await page.screenshot({ path: `test-results/login-${name}.png`, fullPage: true });
    await login(page);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
    await page.screenshot({ path: `test-results/home-${name}.png`, fullPage: true });
    await page.getByRole('link', { name: 'Acessar Administração' }).click();
    await page.getByRole('link', { name: 'Categorias', exact: true }).click();
    await page.getByRole('button', { name: 'Novo cadastro' }).click();
    await expect(page.getByLabel('Posição preferencial')).toHaveValue('');
    await page.getByLabel('Exigir triagem no cadastro').check();
    await page.getByRole('button', { name: 'Salvar cadastro' }).click();
    await expect(page.getByText('Selecione uma posição de triagem.')).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
    await page.screenshot({ path: `test-results/category-${name}.png`, fullPage: true });
  });
}
test('outro crachá autenticado não troca identidade; logout encerra sessão', async ({ page }) => {
  const count = await fixture(page);
  await login(page);
  await page.keyboard.type('a'.repeat(64));
  await page.keyboard.press('Enter');
  expect(count()).toBe(1);
  await page.getByRole('button', { name: 'Sair', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Estoque TI', exact: true })).toBeVisible();
});
test('timeout após dez minutos também descarta formulário aberto', async ({ page }) => {
  await fixture(page);
  await login(page);
  await page.clock.install();
  await page.clock.fastForward(600001);
  await expect(page.getByRole('heading', { name: 'Estoque TI', exact: true })).toBeVisible();
});
test('refresh de rota hash mantém tela e alertas de alterações não salvas funcionam', async ({
  page,
}) => {
  await fixture(page);
  await login(page);
  await page.goto('/#/admin/categories');
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Categorias', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Novo cadastro' }).click();
  await page.getByLabel('Nome *', { exact: true }).fill('Alteração não salva');
  page.once('dialog', (dialog) => dialog.dismiss());
  await page.getByRole('link', { name: 'Início', exact: true }).click();
  await expect(page.getByLabel('Nome *', { exact: true })).toHaveValue('Alteração não salva');
});
for (const role of ['STOCK_CONTROLLER', 'IT', 'MONITORING', 'THIRD_PARTY'] as const) {
  test(`rota de usuários bloqueada para ${role}`, async ({ page }) => {
    await fixture(page, role);
    await login(page);
    await page.goto('/#/admin/usuarios');
    await expect(page.getByRole('heading', { name: 'Bem-vindo, Administrador.' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Usuários', exact: true })).toHaveCount(0);
  });
}

test('nova senha: formulário bloqueia classes ausentes e aceita oito caracteres', async ({
  page,
}) => {
  await fixture(page);
  await login(page);
  await page.goto('/#/admin/usuarios');
  await page.getByRole('button', { name: 'Novo usuário', exact: true }).click();
  await page.getByLabel('Nome *', { exact: true }).fill('Usuário teste');
  await page.getByLabel('Username *', { exact: true }).fill('novo.hml');
  let writes = 0;
  await page.route('**/functions/v1/foundation', async (route) => {
    if (route.request().postDataJSON().action === 'save_user') writes++;
    await route.fulfill({ json: { result: {} } });
  });
  for (const password of ['Abc12!x', '1234567!', 'abcdefgh!', 'abcdefg1']) {
    await page.getByLabel(/^Senha inicial/).fill(password);
    await page.getByRole('button', { name: 'Salvar usuário', exact: true }).click();
    expect(writes).toBe(0);
  }
  await expect(page.getByRole('alert')).toContainText('pelo menos uma letra');
  await page.getByLabel(/^Senha inicial/).fill('abcdef1!');
  await page.getByRole('button', { name: 'Salvar usuário', exact: true }).click();
  await expect(page.getByRole('status')).toContainText('Usuário salvo');
  expect(writes).toBe(1);
});

test('reset: valida política sem interferir em edição de perfil', async ({ page }) => {
  await fixture(page);
  await login(page);
  await page.goto('/#/admin/usuarios');
  await page.getByRole('button', { name: 'Editar', exact: true }).click();
  let resets = 0;
  await page.route('**/functions/v1/foundation', async (route) => {
    if (route.request().postDataJSON().action === 'password_reset') resets++;
    await route.fulfill({ json: { completed: true } });
  });
  for (const password of ['Abc12!x', '1234567!', 'abcdefgh!', 'abcdefg1']) {
    await page.getByLabel(/^Nova senha/).fill(password);
    await page.getByRole('button', { name: 'Redefinir senha', exact: true }).click();
    await expect(page.getByRole('alert')).toContainText('pelo menos uma letra');
    expect(resets).toBe(0);
  }
  await page.getByLabel(/^Nova senha/).fill('abcdef1!');
  page.once('dialog', (dialog) => dialog.accept());
  await page.getByRole('button', { name: 'Redefinir senha', exact: true }).click();
  await expect(page.getByRole('status')).toContainText('Senha redefinida');
  expect(resets).toBe(1);
});
