# Revisão de entrega — Phase 01 Foundation

Atualização: 07/10/2026. **Definition of Done ainda pendente de evidências externas. Phase 02 não iniciada.** O relatório de 29/09 foi preservado em `PHASE_01_REVIEW_20260929.md`; as pendências antigas de implantação Supabase não descrevem mais o ambiente atual.

## Evidências de HML fornecidas pelo responsável

Backend/deploy HML concluído. Homologados: login Admin, cadastros-base, categorias, fabricantes, fornecedores/CNPJ, localizações, POS hierárquicas, usuários/perfis, geração/regeneração de QR, acessos excepcionais, desativação com revogação imediata, proteção do último Admin e gravação de auditoria.

**AC-AUTH-004 e DoD 10: Passou em HML.** O responsável confirmou definitivamente que, após 10 minutos de inatividade, a sessão foi encerrada automaticamente **antes de qualquer nova interação**. Essa aprovação não depende de repetir a homologação.

A confirmação geral dos fluxos não foi interpretada como evidência de todos os testes negativos de API, leitor físico ou implantação Pages.

## Alterações desta revisão

- Política única em `supabase/functions/_shared/password-policy.ts`: mínimo 8, letra, número e especial; aplicada no formulário, criação/reset server-side e bootstrap. Limite máximo existente de 128 preservado. Letras Unicode, dígitos decimais e pontuação/símbolos; espaço sozinho não satisfaz especial. Não exige ambas as caixas de letras nem normaliza a senha.
- Login de senha existente e edição sem reset não revalidam a política. Bootstrap não redefine identidades existentes. Nenhuma senha real foi redefinida nesta execução.
- Handler `foundation` valida antes de criar/resetar no Auth; mensagens seguras não contêm valores de senha. Regra também aplicada à retomada de provisionamento.
- Health-check diário somente HML, descrito abaixo; sem nova superfície pública.
- Nenhuma migration nova, alteração de migration aplicada, RPC ou policy RLS. UTC preservado. Nenhuma operação destrutiva, bootstrap, escrita no HML ou acesso a PRD nesta execução.
- Refinamentos de UX adiados. Para etapa futura, preservar identidade JBS e personalidade existente; não copiar o HUB do Bruno. Nenhum refinamento dessa lista foi iniciado.

Arquivos principais: `UsersPage.tsx`, `_shared/password-policy.ts`, `_shared/errors.ts`, `foundation/index.ts`, `bootstrap-hml.mjs`, `hml-health.mjs`, `keep-alive-hml.mjs`, `.github/workflows/keep-alive-hml.yml`, testes de senha/Edge/bootstrap/health/UI, configuração Vitest e documentação.

## Verificações executadas

| Verificação               | Resultado / alcance                                          |
| ------------------------- | ------------------------------------------------------------ |
| ESLint                    | Passou                                                       |
| Typecheck frontend e Edge | Passou                                                       |
| Vitest domínio            | 9/9                                                          |
| Vitest PostgreSQL/PGlite  | 25/25; migrations reais, fixture Auth                        |
| Vitest Edge               | 22/22; handler real, transporte Auth simulado                |
| Vitest política de senha  | 12/12                                                        |
| Vitest bootstrap          | 3/3; provedor simulado, nenhuma conta real alterada          |
| Vitest health-check       | 13/13                                                        |
| Playwright                | 13/13; backend controlado nos testes                         |
| Build Vite                | Passou                                                       |
| Inspeção do bundle        | Passou; 6 arquivos, nenhum padrão sensível detectado         |
| Health-check real HML     | Passou; HTTP 200, contrato GoTrue válido                     |
| Publicação da nova Edge   | Pendente; CLI retornou HTTP 403, falta `edge_functions_read` |
| Ativação GitHub Actions   | Pendente; nenhum remote configurado nesta cópia              |

**97 testes passaram: 84 Vitest + 13 Playwright.** São 41 testes adicionais: 28 relacionados à política de senha e 13 ao health-check. Os seis casos pedidos passaram: menos de 8, ausência de letra, ausência de número, ausência de especial, aceitação de senha válida de 8 ou mais e rejeição pelo backend sem depender do frontend. Também cobertos: letras somente minúsculas/maiúsculas, preservação de contas existentes e ausência de efeitos privilegiados para senha inválida.

Não há regressão conhecida na suíte local final de autenticação, QR, PIN, sessão, permissões ou auditoria. Testes locais não substituem validação da atualização hospedada.

## Critérios de aceite

“Passou — local” delimita evidência automatizada e não declara aprovação hospedada. “Falhou — pendente” indica ausência de evidência suficiente, não necessariamente defeito.

| Critério    | Status             | Evidência / limite                                                                                                |
| ----------- | ------------------ | ----------------------------------------------------------------------------------------------------------------- |
| AC-FND-001  | Passou — HML       | Aplicação e backend homologados pelo responsável                                                                  |
| AC-FND-002  | Falhou — pendente  | Pages, URL/commit e refresh hospedado sem evidência                                                               |
| AC-FND-003  | Passou — local     | Inspeção do bundle sem segredo                                                                                    |
| AC-FND-004  | Passou — local     | Reconstrução/reaplicação de migrations e seed em banco descartável; confirmar registro do seed/bootstrap HML      |
| AC-AUTH-001 | Passou — HML/local | Login Admin homologado; username resolvido server-side                                                            |
| AC-AUTH-002 | Passou — HML/local | Geração homologada; token opaco e impressão cobertos localmente; leitor físico pendente                           |
| AC-AUTH-003 | Passou — local     | Hash antigo revogado; regeneração HML confirmada, falta evidência explícita de login antigo falhar/novo funcionar |
| AC-AUTH-004 | Passou — HML       | Timeout automático de 10 minutos definitivamente aprovado, antes de nova interação                                |
| AC-AUTH-005 | Passou — local     | Não troca identidade ao ler outro crachá; confirmar leitor operacional                                            |
| AC-AUTH-006 | Falhou — pendente  | Troca real QR→Auth→sessão não explicitamente confirmada                                                           |
| AC-EXC-001  | Passou — HML/local | Acessos excepcionais homologados; PIN validado no handler                                                         |
| AC-EXC-002  | Falhou — pendente  | Confirmar evidência do PIN inicial/bootstrap; não restaurar PIN para provar teste                                 |
| AC-EXC-003  | Passou — local     | Troca protegida e PIN atual oculto; confirmar troca real no HML                                                   |
| AC-EXC-004  | Passou — local     | Auditoria não contém PIN/hash                                                                                     |
| AC-EXC-005  | Passou — local     | Rate limit e buckets testados; teste hospedado pendente                                                           |
| AC-EXC-006  | Passou — HML/local | Identidades excepcionais distintas                                                                                |
| AC-PERM-001 | Passou — local     | RLS/papéis em PostgreSQL; API hospedada pendente                                                                  |
| AC-PERM-002 | Passou — local     | DML/RPC vedados recusados sem depender da UI                                                                      |
| AC-PERM-003 | Passou — HML/local | Gestão/perfis homologados, autorização negativa local                                                             |
| AC-PERM-004 | Passou — HML       | Proteção do último Admin homologada                                                                               |
| AC-CAT-001  | Passou — local     | POS preferencial opcional; categorias homologadas no HML                                                          |
| AC-CAT-002  | Passou — local     | “Não definida” sem alerta                                                                                         |
| AC-CAT-003  | Passou — local     | Triagem exige POS                                                                                                 |
| AC-CAT-004  | Passou — local     | POS inativa rejeitada                                                                                             |
| AC-CAT-005  | Passou — local     | Mudança de categoria não movimenta itens                                                                          |
| AC-POS-001  | Passou — HML/local | Árvore dinâmica hierárquica homologada                                                                            |
| AC-POS-002  | Passou — local     | Código único, imutável e não reutilizado                                                                          |
| AC-POS-003  | Passou — local     | Referências bloqueiam desativação                                                                                 |
| AC-POS-004  | Passou — local     | Ciclo/pai inválido rejeitados                                                                                     |
| AC-POS-005  | Passou — HML/local | Caminho calculado e busca; POS homologadas                                                                        |
| AC-AUD-001  | Passou — HML       | Gravação de eventos homologada                                                                                    |
| AC-AUD-002  | Passou — local     | Auditoria imutável; tentativa por API HML pendente                                                                |
| AC-AUD-003  | Passou — local     | Sem credenciais nos eventos                                                                                       |
| AC-AUD-004  | Passou — local     | Save sem mudança não gera evento                                                                                  |

## Definition of Done — item a item

| Item                           | Estado atual                                                                         |
| ------------------------------ | ------------------------------------------------------------------------------------ |
| 1 Aplicação HML                | Passou — homologação do responsável                                                  |
| 2 GitHub Pages                 | Pendente URL, commit, deploy e refresh                                               |
| 3 Migrations recriam estrutura | Passou em banco local descartável; deploy inicial HML confirmado; não resetar HML    |
| 4 Seed HML                     | Passou localmente; confirmar evidência específica do seed/bootstrap HML              |
| 5 Login normal                 | Admin aprovado HML; confirmar demais contas estruturais                              |
| 6 QR de crachá                 | Geração/regeneração aprovadas; login real e impressão/leitor físico pendentes        |
| 7 Regeneração revoga anterior  | Passou localmente; confirmar login com QR anterior recusado e novo aceito            |
| 8 PIN excepcional              | Acessos aprovados HML; confirmação específica de inicial/troca ainda pendente        |
| 9 Rate limit PIN               | Passou localmente; bloqueio/janela/isolamento em HML pendentes                       |
| 10 Timeout 10 min              | **Passou — HML definitivo; encerrou antes de nova interação**                        |
| 11 Logout                      | Passou localmente; confirmar JWT anterior sem acesso no HML                          |
| 12 Perfis e RLS                | Perfis homologados; ataques por API/negativas no HML pendentes                       |
| 13 Gerenciar usuários          | Aprovado HML na versão anterior; nova política precisa publicação e homologação      |
| 14 Último Admin                | Passou — HML                                                                         |
| 15 Categorias                  | Passou — HML; negativos locais na tabela de aceite                                   |
| 16 Fabricantes                 | Passou — HML                                                                         |
| 17 Fornecedores                | Passou — HML, inclusive CNPJ                                                         |
| 18 Localizações                | Passou — HML                                                                         |
| 19 Árvore POS                  | Passou — HML                                                                         |
| 20 Desativação                 | Usuários/excepcionais e revogação aprovados HML; restrições POS testadas localmente  |
| 21 Auditoria                   | Gravação aprovada HML; imutabilidade/omissão de segredos testadas localmente         |
| 22 Sem segredo frontend        | Passou — inspeção estática atual                                                     |
| 23 UI responsiva               | Passou — validação local desktop/tablet/mobile; sem refinamento visual nesta revisão |
| 24 Erros seguros               | Passou — revisão e testes locais                                                     |
| 25 Testes aplicáveis           | 97 passaram; testes externos específicos e nova política HML pendentes               |
| 26 Sem regressões conhecidas   | Passou na suíte local; atualização hospedada ainda não validada                      |
| 27 README                      | Atualizado                                                                           |
| 28 Sem fase futura             | Passou — nenhuma Phase 02 iniciada                                                   |

## Revisão contra MASTER e Phase

Mantidos arquitetura React/Vite/Supabase, autorização server-side, RLS, transações, idempotência, concorrência, último Admin e auditoria imutável. Mantidos cadastros/POS, QR/PIN e sessões da fundação. Módulos operacionais futuros continuam fora do escopo. A regra de senha foi substituída por autorização explícita de 07/10; o cronograma continua seguindo a Phase conforme autorização anterior. Não houve mudança de comportamento em timestamps ou redesenho de UX. Inventário detalhado de tabelas, RPCs e policies permanece no README; revisão estrutural inicial arquivada.

## Keep-alive e limites

Workflow `.github/workflows/keep-alive-hml.yml`, diário às 12:23 UTC (09:23 America/Sao_Paulo), com execução manual. Executa exatamente um `GET https://xghrambcwigdemxancxr.supabase.co/auth/v1/health`, header `apikey` com publishable key HML. Usa endpoint nativo existente, sem consultar tabelas, login, sessão, RPC, Edge, auditoria ou escrita. Sem service role, nova policy ou endpoint.

Exige URL HML exata, chave pública, HTTP 200 e contrato GoTrue; recusa redirects, timeout 15s, falha explícita com exit code 1 e sem corpo/headers sensíveis em logs. Teste real passou. Ativação depende de publicação na branch padrão, variável pública `VITE_SUPABASE_PUBLISHABLE_KEY` e primeira execução Actions. É medida de atividade/monitoramento, **não garantia de evitar pausa do Free Plan**, nem mecanismo de reativação. Referências oficiais no README.

## Ações externas restantes e riscos

1. Corrigir acesso da conta CLI ao HML (consulta retornou HTTP 403 por falta de `edge_functions_read`) e publicar somente a Edge atualizada: `supabase functions deploy foundation --project-ref xghrambcwigdemxancxr --no-verify-jwt`. Não executar reset, migration ou bootstrap para esta mudança.
2. Publicar frontend/workflows no repositório de destino; registrar URL/commit Pages, configurar variáveis públicas/origem e executar health manual. Esta cópia não possui remote.
3. Homologar criação/reset: quatro casos inválidos, senha válida de exatamente 8 caracteres inclusive com uma única caixa de letras, chamada direta à Edge e login de conta existente sem redefinição automática.
4. Inspecionar configuração nativa do Supabase Auth: não deve continuar exigindo 12 ou simultaneamente maiúscula e minúscula. Verificar também alteração direta de senha no provedor, que não passa pela Edge. A política da aplicação está implementada, mas a configuração privada do Auth não foi acessada e a proteção desses caminhos não está aprovada. Caso o provedor não consiga expressar a regra exata, consultar o responsável antes de escolher alternativa arquitetural ou mudar o comportamento.
5. Completar somente evidências externas ainda ausentes do checklist `HML_ACCEPTANCE.md`: contas, QR/leitor, PIN/rate limit, logout/API/RLS, auditoria e publicação. Não repetir timeout já aprovado.

Não enviar credenciais administrativas ou senhas pelo chat; configurar CLI/secrets localmente. Permanecem riscos conhecidos do rate limit excepcional compartilhado e da ausência de transação distribuída entre reset Auth e auditoria SQL. **Não declarar encerramento integral enquanto essas evidências faltarem; não iniciar Phase 02.**
