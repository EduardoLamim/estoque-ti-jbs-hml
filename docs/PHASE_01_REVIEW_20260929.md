# Revisão de entrega — Phase 01 Foundation

Data: 29/09/2026. **Definition of Done ainda não atingido. Phase 02 não iniciada.**

O diretório inicialmente tinha apenas duas especificações e não era repositório Git. Foram criados frontend, backend, migrations, testes, CI, documentação e repositório local. Nenhuma operação foi feita em PRD. Não foram feitas alterações no banco HML: a consulta pública constatou HTTP 404 para a RPC `my_profile` e a Edge Function `foundation`.

## Resultado das verificações

| Verificação executada                | Resultado      | Limite da evidência                                                       |
| ------------------------------------ | -------------- | ------------------------------------------------------------------------- |
| ESLint                               | Passou         | Código local                                                              |
| TypeScript frontend + Edge           | Passou         | Compilador strict; nenhum erro                                            |
| Vitest — domínio                     | 9/9 passaram   | Validações, scanner, timeout, QR e PIN                                    |
| Vitest — banco                       | 25/25 passaram | Migrations reais em PostgreSQL/PGlite; Auth reproduzido por fixture       |
| Vitest — Edge                        | 11/11 passaram | Handler real e criptografia real; transporte Supabase Auth simulado       |
| Playwright                           | 11/11 passaram | Edge headless, backend interceptado só nos testes                         |
| Build Vite                           | Passou         | Assets divididos em chunks; nenhuma advertência de tamanho no build final |
| Bundle                               | Passou         | 6 arquivos inspecionados; nenhum padrão de segredo detectado              |
| `.env.local` e bootstrap fora do Git | Passou         | Confirmado com `git check-ignore`                                         |
| Supabase HML publicado               | Falhou         | RPC e Edge ainda ausentes: HTTP 404                                       |
| GitHub Pages                         | Falhou         | Repositório remoto não informado; deploy não executado                    |
| Impressão/leitor físico              | Falhou         | Hardware não validado nesta execução                                      |

Total automatizado: **56 testes passaram**. As capturas de login, home e categoria em 1440×1000, 768×1024 e 390×844 estão em `test-results/`. Houve inspeção visual de telas desktop/tablet/mobile; os testes também verificaram ausência de overflow horizontal nas páginas.

Falhas encontradas durante o desenvolvimento foram corrigidas: contrato do perfil retornado em JSON, isolamento dos dados de teste/seed, bloqueio de chamadas diretas a RPCs sensíveis, remoção local da sessão mesmo em falha de rede e consulta de operações com resultado incerto. Não há falha conhecida na suíte local final. Isso não equivale a validação integral do serviço hospedado.

## Critérios de aceite da Phase 01

**Passou** abaixo significa evidência local indicada, sem alegar aprovação do ambiente hospedado. **Falhou** inclui requisito ainda não atendido ou cuja validação externa obrigatória não foi possível; não significa necessariamente defeito de código.

| Critério    | Status | Evidência / pendência                                                                                    |
| ----------- | ------ | -------------------------------------------------------------------------------------------------------- |
| AC-FND-001  | Falhou | Aplicação local funciona; execução real em HML depende de implantação                                    |
| AC-FND-002  | Falhou | Hash routing e refresh testados localmente; Pages não publicado                                          |
| AC-FND-003  | Passou | Build inspecionado; credenciais privilegiadas ausentes dos arquivos frontend                             |
| AC-FND-004  | Falhou | Migrations e seed reconstruídos/reaplicados localmente; bootstrap Auth e reconstrução HML pendentes      |
| AC-AUTH-001 | Passou | Login pede username/senha; resolução técnica ocorre somente no servidor                                  |
| AC-AUTH-002 | Passou | QR gerado com token aleatório opaco; impressão contém somente QR                                         |
| AC-AUTH-003 | Passou | Testes de banco invalidam hash antigo e revalidam durante emissão de sessão                              |
| AC-AUTH-004 | Passou | Testes de 10 minutos no cliente e no PostgreSQL; heartbeat não revive sessão expirada                    |
| AC-AUTH-005 | Passou | Teste de navegador confirma ausência de troca de identidade por outro crachá                             |
| AC-AUTH-006 | Falhou | Fronteira server-side implementada e testada com Auth simulado; troca real QR→OTP→sessão no HML pendente |
| AC-EXC-001  | Passou | Handler exige/verifica PIN e não emite sessão para PIN inválido                                          |
| AC-EXC-002  | Falhou | Bootstrap inicial preparado exclusivamente no backend; execução/verificação no HML pendente              |
| AC-EXC-003  | Passou | UI não recebe PIN atual; configuração exige Admin e validação server-side                                |
| AC-EXC-004  | Passou | Auditoria da mudança de PIN não contém valor/hash                                                        |
| AC-EXC-005  | Passou | Contador transacional persistente e resposta 429 testados; buckets separados                             |
| AC-EXC-006  | Passou | Perfis/sessões distintos para Monitoramento/Terceiro, verificados no banco                               |
| AC-PERM-001 | Passou | RLS ativa em tabelas públicas/privadas; papéis testados em PostgreSQL                                    |
| AC-PERM-002 | Passou | DML e RPCs proibidos são recusados por API/banco independentemente da UI                                 |
| AC-PERM-003 | Passou | Controlador/TI/excepcionais não administram usuários; criação/edição Admin testada                       |
| AC-PERM-004 | Passou | Desativação/rebaixamento do último Admin bloqueados no banco                                             |
| AC-CAT-001  | Passou | Categoria sem POS preferencial salva no banco                                                            |
| AC-CAT-002  | Passou | “Não definida” neutro em seletor e listagem                                                              |
| AC-CAT-003  | Passou | Validação de formulário e trigger exigem POS de triagem                                                  |
| AC-CAT-004  | Passou | Select filtra inativas; backend rejeita referência inativa                                               |
| AC-CAT-005  | Passou | Alteração muda somente categoria/auditoria; nenhuma tabela ou operação de itens implementada             |
| AC-POS-001  | Passou | Árvore recursiva, sem níveis fixos                                                                       |
| AC-POS-002  | Passou | Sequência não reutilizável, unique e código imutável                                                     |
| AC-POS-003  | Passou | Referências preferencial/triagem bloqueiam desativação                                                   |
| AC-POS-004  | Passou | Trigger rejeita ciclo e pai inválido                                                                     |
| AC-POS-005  | Passou | Caminho calculado, exibido e incluído na busca; cálculo testado                                          |
| AC-AUD-001  | Passou | Triggers transacionais e eventos explícitos para QR/PIN/identidade                                       |
| AC-AUD-002  | Passou | Sem grants de escrita; trigger de imutabilidade                                                          |
| AC-AUD-003  | Passou | Credenciais isoladas; testes verificam ausência de PIN/hash/QR/e-mail técnico nos eventos                |
| AC-AUD-004  | Passou | Save idêntico mantém versão e contagem de eventos                                                        |

Resumo: **29 critérios passaram localmente; 5 falharam por implantação/validação externa pendente.** Todos os fluxos dependentes de Supabase ainda devem ser repetidos no HML real conforme o checklist.

## Revisão item a item da Phase 01

| Seção            | Implementação / revisão                                                             |
| ---------------- | ----------------------------------------------------------------------------------- |
| 1 — Resultado    | Código da fundação entregue; HML/Pages pendentes                                    |
| 2 — Escopo       | Só cadastros/auth/fundação; módulos futuros são placeholders                        |
| 3 — Stack        | React, TypeScript, Vite, Router, Supabase JS, SQL/Edge, Git/Actions                 |
| 4 — Ambientes    | `.env.local` HML; exemplos sem segredos; PRD recusado pelo build                    |
| 5 — Organização  | Domínio, serviços, features, componentes e hooks separados                          |
| 6 — Migrations   | Duas migrations, sem mudanças manuais de schema                                     |
| 7 — Perfis       | Cinco perfis estruturais; nenhum editor de permissões                               |
| 8 — Usuário      | Perfil vinculado ao Auth; username CI unique; sem exclusão                          |
| 9 — Login        | Username resolvido server-side; sem e-mail técnico na UX                            |
| 10 — QR          | Token CSPRNG, hash, regeneração, confirmação e impressão somente QR                 |
| 11 — Excepcional | Identidades distintas, PIN compartilhado/hash, habilitação, auditoria, rate limit   |
| 12 — Sessão      | Logout, 10 minutos, atividade e nenhuma troca silenciosa                            |
| 13 — RLS         | Grants/policies/revalidação de sessão e papel                                       |
| 14 — Auditoria   | Append-only, old/new, sem segredos, transacional para cadastros                     |
| 15 — Categoria   | Todos os campos, preferencial opcional, triagem condicional                         |
| 16 — Fabricante  | Nome/ativo, duplicidade lógica e auditoria                                          |
| 17 — Fornecedor  | CNPJ normalizado/validado/único, endereço e observação; nenhuma manutenção simulada |
| 18 — Localização | Cadastro de destino operacional independente de POS                                 |
| 19 — POS         | Raiz/filha/renomear, árvore, busca/caminho, código e desativação                    |
| 20 — Usuários    | Admin cria/edita/ativa/desativa/gera QR/reseta senha; último Admin protegido        |
| 21 — Shell       | Navegação e submenus definidos; Administração restrita                              |
| 22 — Início      | Home sem KPI ou número fictício                                                     |
| 23 — Estados     | Loading, vazio, erro, sucesso, confirmação, disabled e inativo                      |
| 24 — Formulários | Labels, obrigatórios, validação, bloqueio de envio, guard de navegação/logout       |
| 25 — Erros       | Catálogo seguro, correlação, logs sem payload/credenciais                           |
| 26 — Segurança   | Revisão de RLS/grants, proteção de sessão, Auth server-side e scanner               |
| 27 — Constraints | FKs, unique, checks e índices; não depende só do frontend                           |
| 28 — Seed        | SQL HML reaplicável + bootstrap Auth com segredos locais                            |
| 29 — README      | Instalação, ambiente, migrations, seed, deploy, arquitetura e testes documentados   |
| 30 — Testes      | 56 testes; limitações de simulação declaradas; aceite real pendente                 |
| 31 — Aceite      | Tabela acima, 29 Passou / 5 Falhou com limite explícito                             |
| 32 — DoD         | Ainda não atingido; veja tabela abaixo                                              |
| 33 — Entrega     | Relatório, inventário, resultados e ações externas disponíveis                      |
| 34 — Parada      | Nenhuma Phase 02 iniciada; continuidade somente na validação da Phase 01            |

## Revisão contra o MASTER

| Regras relevantes                          | Conformidade                                                                                  |
| ------------------------------------------ | --------------------------------------------------------------------------------------------- |
| §§1–3 arquitetura, integridade, transações | Backend como autoridade; React/Vite, Supabase, SQL versionado; operações de cadastro atômicas |
| §§5–8 IDs, POS e cadastros                 | POS opaca/imutável, árvore dinâmica, categorias e cadastros conforme regras aplicáveis        |
| §§9–37 módulos operacionais                | Não implementados; fornecedores/POS têm pontos de extensão sem tabelas fictícias de ativos    |
| §§38–40 autenticação/sessão/excepcional    | Implementados no código; testes reais do provedor e crachá físico pendentes                   |
| §§41–43 perfis/administração               | Matriz estrutural; Admin/Controlador nos cadastros e Admin em acesso                          |
| §44 e-mail                                 | Não implementado; somente placeholder autorizado                                              |
| §45 auditoria                              | Imutável, eventos old/new, save sem alteração sem evento                                      |
| §§46–49 concorrência/idempotência/conexão  | Versão otimista, locks, UUID de operação e consulta de resultado; sem offline                 |
| §§50–53 confirmações/formulários/erros/UX  | Confirmações sensíveis, guard de saída, mensagens seguras e UI responsiva                     |
| §§54–56 dados/ambientes/backup             | Apenas entidades da fundação; HML separado; sem backup próprio antecipado                     |
| §57 critérios gerais                       | Aplicados os critérios relevantes de auth, auditoria, permissões e concorrência               |
| §58 fases                                  | Cronograma da Phase aprovado pelo responsável prevalece; regras não foram alteradas           |
| §§59–61 conclusão e escopo                 | Não alegada conclusão sem HML/Pages; nenhuma funcionalidade futura iniciada                   |

## Definition of Done — situação de cada item

| Item                  | Estado                                                                |
| --------------------- | --------------------------------------------------------------------- |
| 1 Aplicação HML       | Pendente implantação e login real                                     |
| 2 GitHub Pages        | Pendente repositório/deploy                                           |
| 3 Migrations          | Passou reconstrução local; aplicar no HML                             |
| 4 Seed                | SQL passou localmente; bootstrap Auth HML pendente                    |
| 5 Login normal        | Testes locais passaram; Supabase real pendente                        |
| 6 QR                  | Código/testes locais; provedor e leitor físico pendentes              |
| 7 Revogação QR        | Passou no banco; repetir end-to-end HML                               |
| 8 PIN                 | Criptografia/handler passaram; bootstrap/login HML pendente           |
| 9 Rate limit          | Passou no banco e handler; repetir HML                                |
| 10 Timeout            | Passou cliente e servidor local                                       |
| 11 Logout             | Passou navegador e servidor local                                     |
| 12 Perfis/RLS         | Passou PostgreSQL; confirmar PostgREST hospedado                      |
| 13 Gerenciar usuários | Passou criação/edição SQL; Auth real pendente                         |
| 14 Último Admin       | Passou no banco                                                       |
| 15 Categorias         | Implementado/testado; aceite operacional HML pendente                 |
| 16 Fabricantes        | Implementado/testado; aceite operacional HML pendente                 |
| 17 Fornecedores       | Implementado/testado; aceite operacional HML pendente                 |
| 18 Localizações       | Implementado/testado; aceite operacional HML pendente                 |
| 19 POS                | Implementado/testado; aceite operacional HML pendente                 |
| 20 Desativação        | Passou no banco                                                       |
| 21 Auditoria          | Passou no banco                                                       |
| 22 Segredos frontend  | Inspeção estática passou                                              |
| 23 UI responsiva      | Passou testes e inspeção visual local                                 |
| 24 Erros              | Passou teste de mensagem segura e revisão                             |
| 25 Testes             | 56 automatizados passaram; smoke HML ainda não executado              |
| 26 Regressões         | Nenhuma conhecida localmente; baseline inicial sem aplicação anterior |
| 27 README             | Atualizado                                                            |
| 28 Sem fase futura    | Confirmado                                                            |

## Dependências do responsável e riscos remanescentes

1. Disponibilizar acesso administrativo à CLI Supabase HML ou executar os comandos do README. A URL/publishable key já foram fornecidas e configuradas; **não dão autorização para aplicar migrations**.
2. Aplicar migrations/seed, configurar secrets não públicos da Edge e executar bootstrap em terminal confiável. Service role somente no backend/arquivo local ignorado, jamais no frontend ou chat.
3. Informar repositório GitHub; configurar Pages/Repository Variables públicas e origem permitida da Edge.
4. Executar smoke HML e checklist manual, incluindo troca QR→Supabase Auth, PIN, scanner/impressão física, concorrência em duas sessões e fluxos completos.

Riscos técnicos documentados: rate limit global excepcional pode causar bloqueio temporário compartilhado; OTP/Auth ainda dependem de validação no serviço hospedado; provisionamento/reset atravessam a API Auth e transações PostgreSQL sem transação distribuída (retomada/auditoria foram preparadas); sequência POS falha com segurança ao chegar ao limite de cinco dígitos.

Arquivos de implantação, variáveis, RPCs/policies e decisões técnicas detalhadas estão no README. **Não iniciar Phase 02 para contornar essas pendências.**
