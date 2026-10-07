# Estoque TI — Phase 01 Foundation

React + TypeScript + Vite, Supabase Auth/PostgreSQL e GitHub Pages. Implementação restrita à fundação; nenhum fluxo operacional de ativos, materiais, reservas, inventário ou movimentações foi antecipado.

**Estado em 07/10/2026:** backend Supabase HML implantado e fluxos homologados pelo responsável, incluindo encerramento automático da sessão após 10 minutos de inatividade, antes de nova interação. A revisão atual aplica a nova política de senha e prepara health-check diário. Ainda faltam publicar/validar esta atualização e reunir as evidências externas restantes (Pages, testes específicos de segurança e crachá). Consulte [o relatório de aceite](docs/PHASE_01_REVIEW.md). A Phase 02 não foi iniciada.

## Especificações

- [MASTER V1.0](MASTER_SPEC_ESTOQUE_TI.md): arquivo original presente no diretório; o nome mencionado na Phase inclui `_V1.0`, mas o documento recebido chama-se `MASTER_SPEC_ESTOQUE_TI.md` e identifica a versão no conteúdo. Não foi renomeado nem alterado.
- [Phase 01](PHASE_01_FOUNDATION.md): escopo atual.
- Autorização do responsável em 29/09/2026: a Phase prevalece sobre o cronograma da seção 58; o MASTER continua prevalecendo em regras, arquitetura, segurança e comportamento.
- Em 07/10/2026, o responsável substituiu a política de senha anterior por mínimo de 8 caracteres, uma letra, um número e um especial. Aplica-se somente ao definir nova senha. Refinamentos visuais permanecem reservados para etapa futura.

## Pré-requisitos e execução

- Node.js 22.18+ ou 24 LTS; pnpm 10.17.1.
- Supabase CLI e acesso administrativo ao projeto **HML**, somente para implantação.
- Edge instalado no Windows para os testes de UI; Chromium do Playwright no Linux/macOS.
- Docker é opcional para stack Supabase local. Os testes de banco incluídos usam PostgreSQL embarcado/PGlite e não exigem Docker.

```sh
pnpm install --frozen-lockfile
# Copie .env.example para .env.local e configure apenas variáveis públicas.
pnpm dev
```

No ambiente atual, `.env.local` já contém a URL e a publishable key HML fornecidas pelo responsável; esse arquivo é ignorado pelo Git.

| Variável pública                | Uso                                         |
| ------------------------------- | ------------------------------------------- |
| `VITE_APP_ENV`                  | `HML`; o build recusa PRD nesta fase        |
| `VITE_SUPABASE_URL`             | URL pública do HML                          |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Publishable key pública, protegida por RLS  |
| `VITE_BASE_PATH`                | `/` local; `/nome-do-repositorio/` em Pages |

Login sem backend não apresenta dados fictícios. A UI explica a ausência de configuração, e erros de serviço são tratados sem expor mensagens internas.

## Arquitetura

```text
src/app/                      shell, rotas hash, guards
src/domain/                   tipos, permissões de apresentação, validações
src/features/auth/            login, scanner de crachá, sessão/inatividade
src/features/administration/  cadastros, árvore POS, usuários, acesso excepcional
src/components/               campos e estados visuais
src/services/backend.ts       único adaptador do frontend para Supabase
supabase/migrations/          schema, constraints, RLS, transações e auditoria
supabase/functions/           fronteira Auth/admin e criptografia server-side
supabase/seed.sql             fixtures exclusivamente HML
scripts/                      bootstrap seguro, smoke HML, inspeção do bundle
tests/                        domínio, PostgreSQL, Edge e UI
.github/workflows/            validação e publicação manual HML
```

Regras relacionais e de integridade ficam em PostgreSQL; operações privilegiadas do provedor ficam na Edge Function. Componentes não fazem DML diretamente. Migração futura pode substituir o adaptador e o provedor de identidade sem reescrever as regras de estoque da fundação.

### Autenticação e sessão

1. A Edge Function resolve username em e-mail técnico opaco no schema privado. O operador informa apenas usuário/senha.
2. QR contém 32 bytes aleatórios codificados em hexadecimal; o banco guarda somente SHA-256. O servidor valida o hash e cria/verifica um OTP interno do Supabase, devolvendo uma sessão normal. O OTP nunca chega ao navegador. Regeneração substitui o único hash e registra um evento sem segredo.
3. Monitoramento e Terceiro são duas identidades técnicas compartilhadas, sem cadastro individual de operador. PIN único, hash PBKDF2-SHA-256 com salt e 600.000 iterações. Bootstrap configura o PIN inicial prescrito pelo MASTER somente no backend.
4. Cada sessão precisa estar registrada em `private.app_sessions`. Ter um JWT do Supabase, isoladamente, não autoriza operações. RLS verifica perfil ativo, sessão, inatividade e habilitação da identidade excepcional.
5. Inatividade: 10 minutos no cliente **e no servidor**. Atividade envia heartbeat no máximo a cada 15 segundos. No limite, o servidor recusa renovação. Logout revoga a sessão da aplicação e remove as credenciais locais; timeout descarta formulários.
6. `sessionStorage` é usado por aba, sem persistência em `localStorage`. Perfis não são obtidos de metadados editáveis do JWT. Desativação revoga sessões; reativação exige novo login.
7. PIN: limite global de 5 tentativas por 300 segundos, inclusive tentativas válidas. Senha e QR usam buckets separados de 60 tentativas/60 segundos. A contagem é transacional e server-side, sem confiar em IP informado pelo cliente. O bloqueio excepcional não bloqueia login normal. Os parâmetros são passados somente pelo backend.

### Dados, concorrência e auditoria

- `profiles`, `stock_positions`, `categories`, `manufacturers`, `suppliers`, `locations`, `audit_events` têm RLS e nenhuma permissão de DML direto para navegador.
- Tabelas de credenciais, PIN, sessões, rate limit e operações ficam em `private`, fora da API. Não há policy pública permissiva.
- `save_master` e `save_profile` exigem perfil, fazem whitelist de campos, controlam versão, bloqueiam concorrência crítica, gravam evento e operação atomicamente.
- Identificador de operação permite reenvio sem duplicação. Resultado incerto exige consulta ao servidor; não há fila offline.
- POS usa sequência não reutilizável `POS-00001` a `POS-99999`, com falha segura ao esgotar. Código imutável; árvore dinâmica; ciclos e referências inativas são rejeitados. Desativar pai com filha ativa é bloqueado para manter a árvore consistente.
- Último Admin é protegido no banco. Cadastros históricos não têm exclusão pelo produto. Auditoria tem trigger que bloqueia UPDATE/DELETE, inclusive por caminhos normais de Admin.
- Seed/bootstrap geram eventos com ator nulo, representando preparação técnica. Eventos de usuários autenticados mantêm a identidade mesmo em autodesativação.
- CNPJ normalizado, único e com dígitos verificadores para formato numérico e alfanumérico. A validação alfanumérica segue o [manual da Receita Federal](https://www.gov.br/receitafederal/pt-br/centrais-de-conteudo/publicacoes/documentos-tecnicos/cnpj/manual-dv-cnpj.pdf).
- Senha inicial/reset: mínimo de 8 caracteres, pelo menos uma letra, um número e um caractere especial. O limite superior existente de 128 foi preservado. A regra única em `supabase/functions/_shared/password-policy.ts` é usada no frontend, na Edge e no bootstrap. Letras Unicode, dígitos decimais e pontuação/símbolos são reconhecidos; espaço sozinho não cumpre o requisito de especial. Não se exige simultaneamente maiúscula e minúscula, nem se altera/normaliza a senha. Username permanece com 3–64 caracteres alfanuméricos, ponto, hífen ou sublinhado; sem autoinscrição.
- A política não é revalidada no login de senha existente nem na edição de perfil sem reset. O bootstrap verifica somente senhas das identidades ainda não provisionadas e não redefine contas existentes. Senhas técnicas novas dos acessos excepcionais também cumprem a regra, sem mudar o login operacional por PIN.
- Timestamps continuam armazenados em UTC. Nenhuma migration/conversão de timestamps foi feita. A apresentação futura considerará `America/Sao_Paulo`, sem antecipar refinamento de interface.
- Provisão de usuário é retomável por e-mail técnico derivado do UUID da operação. Se o provedor criar a identidade e a transação do perfil falhar, ela fica sem acesso à aplicação e pode ser reutilizada no reenvio. Não há exclusão destrutiva de usuário histórico.
- Reset de senha cruza a API Auth e o banco: há auditoria de solicitação antes da chamada e de conclusão depois; falha intermediária exige conferir resultado. Não é uma transação distribuída.

## Migrations, RLS e funções

| Migration                     | Conteúdo                                                                                   |
| ----------------------------- | ------------------------------------------------------------------------------------------ |
| `202609290001_foundation.sql` | Tabelas, índices, constraints, árvore/categorias, RLS, sessão, auditoria, save idempotente |
| `202609290002_identity.sql`   | Proteção do último Admin, usuários, QR, PIN, rate limit e bootstrap                        |

| Funções                                                                                                                                                                                    | Quem usa                                                                                        |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------- |
| `my_profile`, `touch_session`, `end_session`, `operation_result`                                                                                                                           | Sessão autenticada válida; logout identifica a sessão mesmo após expiração                      |
| `save_master`                                                                                                                                                                              | Admin/Controlador                                                                               |
| `save_profile`, `get_exceptional_settings`                                                                                                                                                 | Admin                                                                                           |
| `regenerate_badge`, `audit_password_reset`, `auth_candidate`, `register_session`, `auth_rate_limit`, `configure_exceptional`, `provisioned_auth_id`, `bootstrap_identity`, `bootstrap_pin` | Somente service role no servidor; QR, reset e configuração excepcional revalidam a sessão Admin |

Policies `read_staff`: Admin/Controlador/TI leem cadastros-base. `read_profile`: usuário lê seu perfil; Admin lê usuários. `read_audit`: Admin/Controlador. Monitoramento/Terceiro não leem cadastros administrativos. Não existem policies de INSERT/UPDATE/DELETE do navegador. Todas as funções `SECURITY DEFINER` usam `search_path` fixo vazio e grants explícitos.

## Implantar no Supabase HML

**Projeto autorizado:** `xghrambcwigdemxancxr`. O frontend não possui nem precisa de service role.

Credenciais necessárias, separadamente e exclusivamente em terminal confiável/secrets:

- Login da Supabase CLI (conta com permissão no HML) e senha do banco solicitada pela CLI.
- Para o bootstrap Node: `SUPABASE_SERVICE_ROLE_KEY` em arquivo local ignorado pelo Git. Não enviar no chat, não usar prefixo `VITE_`, não colocar em variáveis do build Pages.
- Nas Edge Functions, `SUPABASE_URL`, `SUPABASE_ANON_KEY` e `SUPABASE_SERVICE_ROLE_KEY` são fornecidos pelo Supabase; nunca copiar para o frontend.

```sh
supabase login
supabase link --project-ref xghrambcwigdemxancxr
supabase db push --dry-run
supabase db push --include-seed
```

Não executar `db reset --linked`: ele é destrutivo. Reconstrução deve ser testada em banco descartável. Para PostgreSQL/Supabase local: `supabase start` e `supabase db reset` (sem `--linked`).

Crie `.env.edge.local` ignorado pelo Git:

```dotenv
APP_ENV=HML
HML_PROJECT_REF=xghrambcwigdemxancxr
ALLOWED_ORIGINS=http://localhost:5173,http://127.0.0.1:5173
```

Após definir o Pages, acrescente sua origem HTTPS exata a `ALLOWED_ORIGINS` (sem caminho do repositório).

```sh
supabase secrets set --env-file .env.edge.local --project-ref xghrambcwigdemxancxr
supabase functions deploy foundation --project-ref xghrambcwigdemxancxr --no-verify-jwt
```

`verify_jwt=false` é necessário porque login chega sem sessão e a publishable key não é JWT. **Não torna ações administrativas públicas:** a função verifica o token via Auth, consulta o perfil e as RPCs revalidam a sessão.

No painel de **Auth HML**, confirme: autoinscrição desabilitada; provedor e-mail/senha habilitado; Site URL apontando para o frontend HML; JWT de 900 segundos. `supabase/config.toml` configura a stack local; não se presume que ele altere automaticamente as opções do projeto hospedado. Essas são configurações do serviço, não alterações manuais de schema. Não é necessário SMTP para a troca interna do QR.

Crie `.env.bootstrap.local` (ignorado) com:

```dotenv
APP_ENV=HML
HML_PROJECT_REF=xghrambcwigdemxancxr
SUPABASE_URL=https://xghrambcwigdemxancxr.supabase.co
SUPABASE_SERVICE_ROLE_KEY=<somente servidor/terminal>
HML_ADMIN_PASSWORD=<8 ou mais caracteres com letra, número e especial>
HML_CONTROLLER_PASSWORD=<8 ou mais caracteres com letra, número e especial>
HML_IT_PASSWORD=<8 ou mais caracteres com letra, número e especial>
```

```sh
node --env-file=.env.bootstrap.local scripts/bootstrap-hml.mjs
```

Cria `admin.hml`, `controlador.hml`, `ti.hml` e as identidades `monitoramento`/`terceiro`. Não imprime senhas/PIN/tokens. Reexecução não redefine senhas nem o PIN existente. O seed SQL é separado e reaplicável sem duplicar cadastros.

## GitHub Pages

1. Informar/criar repositório GitHub de destino e publicar estes arquivos, mantendo `.env*` locais ignorados. Git já foi iniciado localmente; não há remote configurado nem push realizado.
2. Em Settings → Pages, selecionar **GitHub Actions**.
3. Criar Repository Variables públicas `VITE_SUPABASE_URL` e `VITE_SUPABASE_PUBLISHABLE_KEY` com os valores HML fornecidos.
4. Executar `Deploy HML Pages` manualmente. CI executa lint, typecheck, testes, build e inspeção do bundle; o workflow de validação também executa Playwright.
5. Configurar a origem Pages em `ALLOWED_ORIGINS` e a Site URL no Auth; validar login real e refresh de uma rota `/#/admin/categories`.

Roteamento por hash permite refresh em hospedagem estática sem rewrite. O workflow usa `/nome-do-repositorio/`; para repositório de usuário `usuario.github.io`, ajuste para `/`. Estratégia baseada na [documentação de deploy do Vite](https://vite.dev/guide/static-deploy).

## Testes e build

```sh
pnpm lint
pnpm typecheck
pnpm test
pnpm build
pnpm check:bundle
# Linux/macOS:
pnpm exec playwright install --with-deps chromium
pnpm test:ui
```

- Banco: migrations reais em PostgreSQL embarcado, com as funções `auth.uid()`/`auth.jwt()` e papéis de integração reproduzidos pelo fixture. Não substitui testar PostgREST/Auth/Edge no Supabase hospedado.
- Edge: handler real; transporte Auth simulado; validação PIN real. Não afirma que os endpoints hospedados já funcionam.
- UI: navegador real com respostas de backend controladas **somente nos testes**. Screenshots em `test-results/`.
- `scripts/check-bundle.mjs`: inspeção estática de padrões sensíveis; não é prova matemática da ausência de qualquer segredo.

Após implantação, crie `.env.hml-test.local` com `RUN_HML_SMOKE=1` e as três senhas de teste (sem prefixo `VITE_`) e execute `pnpm test:hml`. O smoke usa o HML real para login, RLS de escrita direta e logout; não apaga registros. Depois execute [o checklist de aceite manual](docs/HML_ACCEPTANCE.md).

## Limitações e próximos passos autorizados

- A implantação inicial do backend HML e a homologação funcional foram confirmadas pelo responsável em 07/10/2026; o registro de 404 de 29/09 é histórico, não o estado atual.
- Publicar a Edge Function e o frontend atualizados para validar a nova política. Não reexecutar bootstrap nem resetar senhas existentes por causa desta atualização. Nenhuma migration nova foi necessária e as migrations aplicadas foram preservadas.
- A tentativa de consultar as funções HML nesta execução retornou HTTP 403 por falta da permissão `edge_functions_read` na credencial CLI disponível. Corrigir o acesso da conta local antes de publicar `foundation`; esta atualização ainda não foi implantada por esta execução.
- Conferir se a configuração nativa de senha do Supabase Auth ainda exige 12 caracteres ou classes adicionais: não marcar a nova política como homologada antes de confirmar aceitação de senha válida com exatamente 8 caracteres e apenas uma caixa de letras. A validação da aplicação está na Edge; configurações privadas do Auth não foram inspecionadas/alteradas nesta execução. Chamadas diretas de alteração de senha ao próprio provedor também precisam ser verificadas na revisão de segurança HML, sem presumir que a Edge intercepta esses endpoints.
- Repositório remoto/Pages e primeira execução Actions não têm evidência disponível nesta cópia local. Não foi realizado push/deploy nesta execução.
- Scanner físico e impressão do QR de crachá de 25 mm ainda precisam de teste operacional.
- Rate limit global prioriza proteção contra PIN de baixa entropia; pode bloquear temporariamente todo acesso excepcional após abuso. Não afeta login normal. Ajustes de limiar devem ser revistos em HML.
- Reset de senha não é transação distribuída; conferir auditoria `requested/completed` se houver falha do provedor. Nenhuma senha é auditada.
- PRD não configurado nem acessado. A Phase 02 permanece fora de escopo.

Referências técnicas: [Supabase RLS](https://supabase.com/docs/guides/database/postgres/row-level-security), [generateLink](https://supabase.com/docs/reference/javascript/auth-admin-generatelink), [verifyOtp](https://supabase.com/docs/reference/javascript/auth-verifyotp), [migrations e seed](https://supabase.com/docs/guides/deployment/database-migrations).

## Keep-alive HML somente de leitura

`.github/workflows/keep-alive-hml.yml` executa diariamente às **12:23 UTC (09:23 America/Sao_Paulo)** e permite execução manual. O runner utiliza Node 22 e não instala dependências do projeto. A única requisição é:

```text
GET https://xghrambcwigdemxancxr.supabase.co/auth/v1/health
apikey: publishable key HML
```

É o [health-check nativo do Supabase Auth](https://supabase.com/docs/guides/troubleshooting/how-do-i-check-gotrueapi-version-of-a-supabase-project-lQAnOR), já existente e público. Não consulta tabelas da aplicação, não autentica usuários, não renova sessões, não chama RPC/Edge, não grava auditoria nem cria dados. Nenhuma policy/RLS ou endpoint foi aberto.

O script exige URL exata e `APP_ENV=HML`, recusa chaves privilegiadas, não segue redirects e limita a chamada a 15 segundos. Aceita somente HTTP 200 com JSON `name: GoTrue` e versão não vazia. Erro de rede/timeout/status/contrato resulta em exit code 1 e falha explícita no Actions, sem imprimir headers, chave ou corpo da resposta. A consulta real em 07/10/2026 passou.

Para ativar: publicar o workflow na branch padrão e configurar a Repository Variable pública `VITE_SUPABASE_PUBLISHABLE_KEY` já utilizada pelo build com a chave HML. Rodar manualmente **HML read-only health** e confirmar sucesso. O workflow tem somente `contents: read`; não usa service role nem token administrativo. O script não integra o bundle frontend.

Esse health-check é uma medida leve de monitoramento/atividade, **não uma garantia contra pausa**: a [política do Free Plan](https://supabase.com/docs/guides/platform/free-project-pausing) considera baixa atividade e não garante que uma chamada diária ao Auth seja suficiente. Ele também não reativa automaticamente um projeto pausado. Se isso não for suficiente, decidir plano/uso legítimo do ambiente, sem criar tráfego de escrita ou abrir dados.
