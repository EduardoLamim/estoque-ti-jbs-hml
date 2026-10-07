# PHASE 01 --- FOUNDATION

> Atualização autorizada em 07/10/2026: novas senhas devem ter no mínimo
> 8 caracteres, uma letra, um número e um caractere especial. Aplicar na
> criação/reset/provisionamento, frontend, servidor e bootstrap; não alterar
> senhas já existentes. O backend HML já foi implantado e o timeout de 10
> minutos foi homologado: encerra a sessão antes de nova interação. Evidências
> e pendências estão em `docs/PHASE_01_REVIEW.md`. Esta revisão não autoriza
> Phase 02, refinamentos visuais ou alterações de timestamps UTC.

**Projeto:** Estoque TI --- Gestão de ativos e materiais de TI\
**Documento de referência obrigatório:**
`MASTER_SPEC_ESTOQUE_TI_V1.0.md`\
**Fase:** 01 --- Fundação\
**Objetivo:** criar a base técnica, de segurança e de interface sobre a
qual todas as demais fases serão construídas.

> Este documento não substitui o MASTER_SPEC. Em caso de dúvida ou
> aparente conflito, o MASTER_SPEC é a fonte de verdade. Não implementar
> funcionalidades de fases futuras apenas porque tabelas ou conceitos
> são citados aqui.

------------------------------------------------------------------------

## 1. Resultado esperado da fase

Ao final desta fase deve existir uma aplicação executável em Homologação
com:

-   React + TypeScript + Vite;
-   estrutura de projeto organizada;
-   deploy funcional no GitHub Pages;
-   integração com Supabase HML;
-   migrations versionadas;
-   autenticação normal;
-   autenticação por QR de crachá preparada e funcional;
-   acesso excepcional Monitoramento/Terceiro protegido por PIN;
-   perfis estruturais e autorização server-side;
-   RLS;
-   sessão e logout;
-   layout principal responsivo;
-   navegação base;
-   Administração;
-   usuários;
-   categorias;
-   fabricantes;
-   fornecedores;
-   localizações;
-   posições de estoque hierárquicas;
-   auditoria administrativa inicial;
-   tratamento padronizado de erros.

Não deve existir ainda o ciclo funcional completo de Ativos, Materiais,
Reservas, Inventário etc.

------------------------------------------------------------------------

## 2. Regra de escopo

### 2.1 Implementar nesta fase

1.  Bootstrap do frontend.
2.  Configuração de HML.
3.  Pipeline de migrations.
4.  Estrutura base do banco.
5.  Perfis.
6.  Usuários.
7.  Autenticação.
8.  QR de crachá.
9.  Acesso excepcional por PIN.
10. RLS/autorização.
11. Sessão.
12. Shell visual da aplicação.
13. Navegação.
14. Cadastros administrativos-base.
15. Posições hierárquicas.
16. Auditoria administrativa.
17. Tratamento de erros.
18. Testes aplicáveis.

### 2.2 Não implementar nesta fase

-   cadastro funcional de ativos;
-   cadastro funcional de materiais;
-   entrada/saída;
-   reservas;
-   movimentação operacional;
-   triagem;
-   manutenção;
-   descarte;
-   inventário;
-   ajustes;
-   divergências;
-   estoque mínimo;
-   alertas de e-mail;
-   fila/PDF de etiquetas;
-   scanner operacional de A/M/POS;
-   dashboard final com indicadores reais;
-   lógica completa de câmera.

Pode haver placeholders de navegação para fases futuras, desde que
claramente identificados como indisponíveis e sem regra de negócio
simulada.

------------------------------------------------------------------------

## 3. Stack obrigatória

### Frontend

-   React.
-   TypeScript.
-   Vite.
-   React Router ou solução equivalente adequada.
-   Supabase JS client.
-   Biblioteca de formulários/validação pode ser adotada se trouxer
    ganho real e não criar complexidade desnecessária.

### Backend

-   Supabase HML.
-   PostgreSQL.
-   Supabase Auth.
-   Row Level Security.
-   PostgreSQL functions/RPC para operações críticas quando apropriado.
-   Edge Functions para operações administrativas/autenticação sensíveis
    quando apropriado.

### Versionamento

-   Git.
-   Migrations versionadas.
-   GitHub Actions para build/deploy do frontend.

------------------------------------------------------------------------

## 4. Estrutura de ambientes

Criar configuração que diferencie explicitamente:

-   HML;
-   PRD.

Nesta fase o desenvolvimento deve apontar somente para HML.

Variáveis públicas permitidas no frontend:

-   URL pública do Supabase;
-   anon/publishable key apropriada.

Nunca colocar no frontend:

-   service role;
-   PIN excepcional;
-   hash do PIN;
-   segredos de QR;
-   credenciais administrativas;
-   chaves privadas;
-   credenciais de e-mail.

Criar `.env.example` sem segredos reais.

------------------------------------------------------------------------

## 5. Organização do projeto

Adotar estrutura previsível, por exemplo:

``` text
src/
  app/
  components/
  features/
    auth/
    administration/
    categories/
    manufacturers/
    suppliers/
    locations/
    stock-positions/
    users/
  hooks/
  lib/
  routes/
  services/
  types/
  utils/
```

Não é obrigatório seguir exatamente os nomes acima, mas evitar:

-   componentes gigantes;
-   lógica de banco espalhada por componentes;
-   regras de autorização repetidas manualmente;
-   chamadas Supabase sem camada mínima de organização.

------------------------------------------------------------------------

## 6. Migrations

Criar diretório/mecanismo padrão do Supabase para migrations.

Toda estrutura desta fase deve nascer via migration.

Não depender de alterações manuais permanentes no painel Supabase.

Migrations devem contemplar:

-   extensões necessárias;
-   enums/check constraints quando adequados;
-   tabelas;
-   relacionamentos;
-   índices;
-   RLS;
-   policies;
-   functions/RPC;
-   triggers indispensáveis;
-   seeds estruturais mínimos quando apropriado.

Seeds de dados fictícios de HML devem ser claramente separados de dados
estruturais.

------------------------------------------------------------------------

## 7. Perfis estruturais

Criar perfis:

-   `ADMIN`
-   `STOCK_CONTROLLER`
-   `IT`
-   `MONITORING`
-   `THIRD_PARTY`

Apresentação na UI:

-   Administrador.
-   Controlador de Estoque.
-   TI.
-   Operador de Monitoramento.
-   Terceiro.

Não criar editor de permissões.

As permissões são definidas pela aplicação e pelo backend conforme
MASTER_SPEC.

------------------------------------------------------------------------

## 8. Modelo de usuário

Criar tabela de perfil da aplicação vinculada à identidade do Supabase
Auth.

Campos conceituais mínimos:

-   id;
-   auth_user_id;
-   username;
-   display_name;
-   profile;
-   active;
-   badge_token_hash ou estrutura segura equivalente;
-   timestamps;
-   created_by / updated_by quando aplicável.

Regras:

-   `username` único, case-insensitive;
-   usuário inativo não acessa a aplicação;
-   perfil obrigatório;
-   não apagar usuários com histórico;
-   desativar em vez de excluir.

------------------------------------------------------------------------

## 9. Login normal

UX:

``` text
Usuário
Senha

[ Entrar ]

Bipe seu crachá para entrar.
```

O operador não precisa lidar com e-mail.

Como Supabase Auth trabalha com identidade própria, criar abstração
segura para mapear o `username` visível à identidade técnica necessária.

Não:

-   expor service role;
-   consultar tabela privada inseguramente para descobrir credenciais;
-   montar e-mail previsível no frontend se isso criar brecha de
    enumeração ou acoplamento desnecessário.

O mecanismo escolhido deve ser documentado no código/README técnico.

------------------------------------------------------------------------

## 10. Login por QR de crachá

### 10.1 Token

QR contém somente token opaco, aleatório e criptograficamente
imprevisível.

Não contém:

-   nome;
-   username;
-   senha;
-   matrícula;
-   perfil;
-   URL;
-   JSON.

### 10.2 Armazenamento

Preferir hash/representação segura no banco.

Token puro só deve existir quando necessário para geração/exibição
inicial do QR.

### 10.3 Validação

Fluxo conceitual:

1.  login screen recebe token pelo scanner;
2.  envia token para endpoint/backend seguro;
3.  backend valida hash + usuário ativo;
4.  backend estabelece mecanismo seguro de autenticação;
5.  frontend recebe sessão válida;
6.  token do QR não se torna JWT permanente.

### 10.4 Novo QR

Admin pode executar:

`Gerar novo QR`

Exigir confirmação.

Ao gerar:

-   invalidar QR anterior imediatamente;
-   produzir novo token;
-   exibir QR para impressão;
-   não exibir token textual desnecessariamente;
-   não registrar token em logs/auditoria.

Auditoria registra apenas:

`QR de acesso regenerado`

sem segredo.

------------------------------------------------------------------------

## 11. Acesso excepcional

Tela de login deve oferecer:

``` text
Acesso excepcional
[ Monitoramento ]
[ Terceiro ]
```

Após selecionar:

``` text
Informe o PIN de acesso
[____]

[ Entrar ]
```

### 11.1 PIN inicial

PIN inicial de HML/PRD:

`5555`

**Importante:** o valor não pode ficar hardcoded ou recuperável no
bundle frontend.

Deve existir apenas em armazenamento/configuração server-side segura,
preferencialmente como hash.

### 11.2 Identidade

Após validação:

-   Monitoramento opera como identidade lógica `monitoramento`;
-   Terceiro opera como identidade lógica `terceiro`.

Não criar usuário individual para cada operador excepcional.

### 11.3 Alteração do PIN

Administração → Acesso → Acessos excepcionais.

Permitir:

-   habilitar/desabilitar Monitoramento;
-   habilitar/desabilitar Terceiro;
-   alterar PIN compartilhado.

Campos:

-   Novo PIN;
-   Confirmar novo PIN.

Nunca mostrar PIN atual.

Auditoria:

-   registrar que PIN foi alterado;
-   nunca registrar valor antigo/novo.

### 11.4 Brute force

Implementar proteção server-side contra tentativas automatizadas.

Requisitos:

-   contabilizar tentativas inválidas de forma apropriada;
-   aplicar bloqueio temporário/rate limit;
-   não revelar se o problema foi PIN incorreto, identidade específica
    ou configuração interna;
-   não bloquear usuários normais da aplicação devido a tentativas no
    acesso excepcional.

Parâmetros podem ser configuráveis, mas devem possuir defaults seguros.

------------------------------------------------------------------------

## 12. Sessão

### 12.1 Logout

Botão `Sair` disponível para usuários autenticados e acessos
excepcionais.

### 12.2 Inatividade

Timeout padrão:

**10 minutos**

Atividade inclui:

-   mouse;
-   teclado;
-   scanner;
-   navegação;
-   operação.

Após expiração:

-   encerrar sessão;
-   retornar ao login.

Arquitetar o valor para futura configuração.

### 12.3 Outro crachá durante sessão

Não trocar usuário silenciosamente.

Nesta fase, caso leitura de crachá seja detectada durante sessão
autenticada:

-   ignorar como mecanismo de login;
-   não substituir identidade atual.

------------------------------------------------------------------------

## 13. Autorização e RLS

RLS deve estar habilitado nas tabelas que contêm dados da aplicação.

A autorização não pode depender somente de:

``` tsx
{isAdmin && <Button />}
```

A UI esconde/desabilita o que não é permitido, mas o backend também
bloqueia.

Criar funções auxiliares de autorização no banco quando isso reduzir
duplicação e mantiver segurança.

Evitar policies excessivamente permissivas.

------------------------------------------------------------------------

## 14. Auditoria administrativa

Criar estrutura de auditoria append-only para alterações administrativas
relevantes.

Eventos desta fase:

-   usuário criado;
-   usuário atualizado;
-   usuário ativado/desativado;
-   perfil alterado;
-   QR regenerado;
-   categoria criada/alterada/desativada;
-   fabricante criado/alterado/desativado;
-   fornecedor criado/alterado/desativado;
-   localização criada/alterada/desativada;
-   posição criada/alterada/desativada;
-   PIN excepcional alterado;
-   acesso excepcional habilitado/desabilitado.

Evento deve conter, quando aplicável:

-   tipo;
-   entidade;
-   entity_id;
-   usuário/identidade responsável;
-   timestamp;
-   diferenças old/new sem segredos.

Não permitir UPDATE/DELETE normal desses eventos.

------------------------------------------------------------------------

## 15. Categoria

Tela Administração → Cadastros → Categorias.

Campos:

-   Nome \*.
-   Ativo/Inativo.
-   Posição preferencial opcional.
-   Exigir triagem no cadastro.
-   Exigir triagem no retorno de uso.
-   Posição de triagem condicional.
-   Exigir hostname ao colocar Em uso.
-   Observação opcional.

### 15.1 Regras

Posição preferencial:

-   opcional;
-   `Não definida` é estado válido;
-   visual neutro;
-   não gerar alerta.

Se:

-   triagem no cadastro = Sim;
-   ou triagem no retorno = Sim;

então:

-   Posição de triagem é obrigatória.

Não permitir salvar configuração inválida.

Não permitir selecionar posição inativa.

Nesta fase não é necessário implementar o efeito dessas regras sobre
ativos, apenas armazená-las e validá-las corretamente.

------------------------------------------------------------------------

## 16. Fabricante

Tela Administração → Cadastros → Fabricantes.

Campos:

-   Nome \*.
-   Ativo/Inativo.

Regras:

-   evitar duplicidade lógica;
-   desativar, não apagar quando utilizado;
-   auditoria old/new.

------------------------------------------------------------------------

## 17. Fornecedor

Tela Administração → Cadastros → Fornecedores.

Campos:

-   Nome \*.
-   CNPJ \*.
-   Endereço \*.
-   Observação opcional.
-   Ativo/Inativo.

Validação:

-   CNPJ com formato/validação adequada;
-   evitar duplicidade de CNPJ.

Regra futura:

-   fornecedor com ativo Em manutenção não poderá ser desativado.

Como Ativos ainda não existem funcionalmente nesta fase, preparar a
modelagem para essa validação posterior sem simular registros de
manutenção.

------------------------------------------------------------------------

## 18. Localização

Tela Administração → Cadastros → Localizações.

Campos:

-   Nome \*.
-   Observação opcional.
-   Ativo/Inativo.

Regras:

-   usada futuramente para Em uso e Retirada temporária;
-   não confundir com posição física;
-   desativada deixa de aparecer em novas operações;
-   histórico mantém referência.

------------------------------------------------------------------------

## 19. Posições de estoque

Tela Administração → Estoque → Posições de estoque.

### 19.1 Estrutura

Árvore dinâmica com:

-   id;
-   code `POS-xxxxx`;
-   name;
-   parent_id;
-   active;
-   timestamps.

Não hardcodar níveis.

### 19.2 Interface

Permitir:

-   criar posição raiz;
-   criar posição filha;
-   editar nome;
-   visualizar caminho completo;
-   ativar/desativar conforme regras;
-   navegar pela árvore;
-   buscar por código/nome.

Exemplo:

``` text
Armário 4
 ├─ Prateleira 1
 │   ├─ Lado A
 │   └─ Lado B
 ├─ Prateleira 2
 └─ Gaveta 1
```

### 19.3 Código

Gerar código opaco:

`POS-00001`

Não reutilizar código.

Código é imutável após criação.

### 19.4 Desativação

Nesta fase já impedir desativação quando a POS for:

-   posição preferencial de categoria;
-   posição de triagem de categoria;
-   pai necessário de posição ativa descendente, se a modelagem exigir
    consistência da árvore.

Nas fases futuras acrescentar:

-   impedir se houver item fisicamente armazenado.

Não apagar posição com histórico.

------------------------------------------------------------------------

## 20. Usuários

Tela Administração → Acesso → Usuários.

Somente Admin.

### 20.1 Lista

Exibir:

-   Nome;
-   Username;
-   Perfil;
-   Status;
-   Último acesso, se disponível;
-   ações.

### 20.2 Cadastro

Campos:

-   Nome \*.
-   Username \*.
-   Perfil \*.
-   Senha inicial ou mecanismo seguro equivalente.
-   Ativo.

### 20.3 Ações

-   Editar.
-   Ativar/desativar.
-   Gerar novo QR.
-   Resetar senha, se necessário ao mecanismo escolhido.

Não permitir exclusão destrutiva de usuário histórico.

### 20.4 Proteções

Evitar que operação administrativa deixe o sistema sem nenhum Admin
ativo.

Se Admin tentar desativar/rebaixar o último Admin ativo:

-   bloquear;
-   mensagem clara.

------------------------------------------------------------------------

## 21. Shell visual

Criar estrutura principal alinhada à identidade do HUB.

### 21.1 Navegação

Exibir:

1.  Início.
2.  Ativos.
3.  Materiais.
4.  Cadastrar.
5.  Reservas.
6.  Inventário.
7.  Movimentações.
8.  Administração.

Nesta fase, rotas futuras podem exibir estado:

`Funcionalidade disponível em uma próxima etapa.`

Não criar dados falsos que aparentem funcionalidade pronta.

### 21.2 Administração

Submenus:

**Cadastros** - Categorias. - Fabricantes. - Fornecedores. -
Localizações.

**Estoque** - Posições de estoque. - Materiais --- placeholder nesta
fase. - Ajustes de estoque --- placeholder. - Divergências ---
placeholder.

**Etiquetas** - Fila de impressão --- placeholder. - Reimpressões ---
placeholder.

**Notificações** - Alertas --- placeholder.

**Acesso** - Usuários --- Admin. - Acessos excepcionais --- Admin.

### 21.3 Responsividade

Validar:

-   desktop;
-   tablet;
-   celular.

Menu deve continuar utilizável sem quebrar layout.

------------------------------------------------------------------------

## 22. Início nesta fase

Não implementar ainda dashboard final com KPIs.

Criar uma Home de fundação simples e profissional, podendo conter:

-   título;
-   identificação do usuário;
-   perfil;
-   ambiente HML de forma discreta;
-   atalhos administrativos conforme permissão;
-   mensagem indicando que módulos operacionais serão habilitados nas
    próximas fases.

Evitar cards com números falsos.

------------------------------------------------------------------------

## 23. Estados visuais

Padronizar:

-   loading;
-   empty state;
-   erro;
-   sucesso;
-   confirmação;
-   disabled;
-   inativo.

Exemplo de lista vazia:

``` text
Nenhuma categoria cadastrada.
Cadastre a primeira categoria para começar a organizar o estoque.
[ Nova categoria ]
```

Evitar telas brancas sem explicação.

------------------------------------------------------------------------

## 24. Formulários

Requisitos:

-   labels visíveis;
-   indicação clara de obrigatório;
-   mensagens junto ao campo;
-   submit desabilitado durante processamento;
-   evitar duplo envio;
-   alerta ao sair com alteração não salva.

Não utilizar confirmação redundante para salvar cadastro normal.

Exigir confirmação para:

-   desativar master data;
-   gerar novo QR;
-   ações sensíveis explicitadas no MASTER_SPEC.

------------------------------------------------------------------------

## 25. Erros

Criar camada central de tratamento de erros.

Nunca renderizar diretamente mensagens internas do Supabase/Postgres.

Para erro inesperado:

``` text
Não foi possível concluir a operação.
Tente novamente. Se o problema continuar, entre em contato com a TI.

Código: ERR-XXXX
```

Gerar correlação técnica apropriada para logs.

Erros de validação de negócio devem ser específicos.

------------------------------------------------------------------------

## 26. Segurança

Checklist mínimo:

-   [ ] RLS habilitado.
-   [ ] Policies revisadas.
-   [ ] Nenhum service role no frontend.
-   [ ] Nenhum PIN no frontend.
-   [ ] Nenhum token QR persistido em log.
-   [ ] Rotas administrativas protegidas.
-   [ ] Backend valida perfil.
-   [ ] Usuário inativo não autentica/opera.
-   [ ] Acesso excepcional usa validação server-side.
-   [ ] Rate limit do PIN.
-   [ ] QR anterior é invalidado após regeneração.
-   [ ] Auditoria não contém segredo.
-   [ ] Último Admin ativo não pode ser removido/rebaixado.
-   [ ] Inputs e retornos não confiam em dados fornecidos pelo cliente.

------------------------------------------------------------------------

## 27. Índices e constraints iniciais

Implementar constraints/índices adequados, incluindo conceitualmente:

-   username único case-insensitive;
-   código POS único;
-   CNPJ único normalizado;
-   integridade parent_id de POS;
-   FKs;
-   índices em campos de busca frequente;
-   perfil válido;
-   status ativo;
-   referências de categoria para POS.

Não usar apenas validação frontend para unicidade.

------------------------------------------------------------------------

## 28. Dados iniciais de HML

Criar seed de HML suficiente para teste.

Sugestão:

-   1 Admin;
-   1 Controlador;
-   1 TI;
-   algumas categorias;
-   fabricantes;
-   fornecedor;
-   localizações;
-   árvore de posições.

Não utilizar nomes/senhas/segredos reais de Produção no repositório.

Se credenciais de teste forem necessárias, documentar mecanismo
seguro/local para configurá-las.

------------------------------------------------------------------------

## 29. README técnico

Atualizar/criar README com:

-   pré-requisitos;
-   instalação;
-   variáveis de ambiente;
-   como rodar local;
-   como aplicar migrations em HML;
-   como popular seed HML;
-   como executar testes;
-   como gerar build;
-   como funciona deploy GitHub Pages;
-   arquitetura resumida;
-   diferença HML/PRD;
-   regras sobre segredos;
-   referência ao MASTER_SPEC.

Não duplicar todo o MASTER_SPEC no README.

------------------------------------------------------------------------

## 30. Testes da fase

Criar testes automatizados onde agregarem valor e checklist manual para
fluxos de UI.

Obrigatoriamente testar:

### Auth

-   login válido;
-   login inválido;
-   usuário inativo;
-   logout;
-   timeout;
-   QR válido;
-   QR inválido;
-   QR antigo após regeneração;
-   acesso excepcional PIN correto;
-   PIN incorreto;
-   rate limit.

### Permissões

-   Admin acessa usuários;
-   Controlador não acessa usuários;
-   TI não altera master data;
-   Monitoramento/Terceiro não acessam Administração;
-   tentativa direta por API/backend também é bloqueada.

### Categorias

-   preferencial vazia é aceita;
-   triagem habilitada sem POS de triagem é rejeitada;
-   POS inativa não pode ser selecionada;
-   alteração gera auditoria.

### Posições

-   raiz;
-   filho;
-   caminho;
-   código único;
-   desativação bloqueada quando referenciada;
-   árvore não aceita referência inválida/ciclo.

### Auditoria

-   evento criado;
-   old/new correto;
-   sem segredo;
-   UPDATE/DELETE bloqueado para perfis normais.

------------------------------------------------------------------------

## 31. Critérios de aceite específicos da Fase 1

### Fundação

**AC-FND-001** --- Aplicação executa localmente e em HML.\
**AC-FND-002** --- Build do GitHub Pages funciona com navegação/refresh
conforme estratégia escolhida.\
**AC-FND-003** --- Nenhum segredo sensível está presente no bundle
frontend.\
**AC-FND-004** --- Banco HML pode ser reconstruído pelas migrations +
seed apropriado.

### Auth

**AC-AUTH-001** --- Login normal não exige que operador conheça e-mail
técnico.\
**AC-AUTH-002** --- QR contém somente token opaco.\
**AC-AUTH-003** --- Novo QR invalida o anterior.\
**AC-AUTH-004** --- Sessão expira após 10 minutos de inatividade.\
**AC-AUTH-005** --- Outro crachá durante sessão não troca usuário.\
**AC-AUTH-006** --- QR é validado server-side e não funciona como JWT
permanente.

### Acesso excepcional

**AC-EXC-001** --- Monitoramento/Terceiro exigem PIN.\
**AC-EXC-002** --- PIN inicial é 5555, mas não está exposto no
frontend/bundle.\
**AC-EXC-003** --- Admin pode alterar PIN sem visualizar o atual.\
**AC-EXC-004** --- Auditoria da troca não contém PIN.\
**AC-EXC-005** --- Tentativas repetidas incorretas sofrem rate
limit/bloqueio temporário.\
**AC-EXC-006** --- Monitoramento e Terceiro continuam sendo identidades
distintas.

### Permissões

**AC-PERM-001** --- Autorização é aplicada no backend/RLS.\
**AC-PERM-002** --- Esconder botão não é a única proteção.\
**AC-PERM-003** --- Somente Admin administra usuários.\
**AC-PERM-004** --- Último Admin ativo não pode ser
desativado/rebaixado.

### Categorias

**AC-CAT-001** --- Posição preferencial é opcional.\
**AC-CAT-002** --- Sem preferencial, UI mostra `Não definida` de forma
neutra.\
**AC-CAT-003** --- Habilitar qualquer regra de triagem torna POS de
triagem obrigatória.\
**AC-CAT-004** --- POS preferencial/triagem inativa não pode ser
selecionada.\
**AC-CAT-005** --- Alterar preferencial não movimenta nenhum item
existente.

### Posições

**AC-POS-001** --- Hierarquia não possui níveis hardcoded.\
**AC-POS-002** --- Código segue `POS-xxxxx` e é único/imutável.\
**AC-POS-003** --- Posição referenciada por categoria não pode ser
desativada.\
**AC-POS-004** --- Não é possível criar ciclo na árvore.\
**AC-POS-005** --- Caminho completo pode ser exibido e pesquisado.

### Auditoria

**AC-AUD-001** --- Alteração administrativa relevante gera evento.\
**AC-AUD-002** --- Eventos não são editáveis/excluíveis por fluxo
normal.\
**AC-AUD-003** --- Segredos não aparecem no evento.\
**AC-AUD-004** --- Save sem alteração não gera evento desnecessário.

------------------------------------------------------------------------

## 32. Definition of Done

A Fase 1 só termina quando:

1.  aplicação abre em HML;
2.  GitHub Pages está funcional;
3.  migrations recriam estrutura;
4.  seed HML funciona;
5.  login normal funciona;
6.  QR de crachá funciona;
7.  regeneração invalida QR anterior;
8.  acesso excepcional com PIN funciona;
9.  rate limit do PIN foi testado;
10. timeout de 10 min funciona;
11. logout funciona;
12. perfis e RLS estão validados;
13. Admin consegue gerenciar usuários;
14. último Admin está protegido;
15. categorias funcionam;
16. fabricantes funcionam;
17. fornecedores funcionam;
18. localizações funcionam;
19. árvore de POS funciona;
20. regras de desativação implementadas;
21. auditoria administrativa funciona;
22. nenhum segredo foi encontrado no frontend;
23. UI foi validada em desktop/tablet/mobile;
24. erros não vazam detalhes internos;
25. testes aplicáveis passam;
26. não há regressões conhecidas;
27. README está atualizado;
28. nenhuma funcionalidade de fase futura foi implementada de forma
    improvisada.

------------------------------------------------------------------------

## 33. Entrega esperada do Codex

Ao concluir, apresentar:

1.  resumo objetivo do que foi implementado;
2.  estrutura de arquivos relevante;
3.  migrations criadas;
4.  funções/RPC/Edge Functions criadas;
5.  policies RLS implementadas;
6.  variáveis de ambiente necessárias, sem valores secretos;
7.  como executar localmente;
8.  como aplicar em HML;
9.  como executar testes;
10. resultados dos testes;
11. critérios de aceite da Fase 1 marcados como Passou/Falhou;
12. pendências conhecidas;
13. decisões técnicas tomadas que não alteram regra de negócio;
14. confirmação explícita de que não avançou para funcionalidades de
    fases futuras.

------------------------------------------------------------------------

## 34. Instrução de parada

Após cumprir o Definition of Done:

**PARE.**

Não iniciar Fase 2.

Não cadastrar ativos/materiais funcionalmente apenas para "adiantar".

Não criar reservas, inventário ou movimentações.

Aguardar validação humana da Fase 1 e instrução explícita para
prosseguir.

------------------------------------------------------------------------

**Fim --- PHASE 01 FOUNDATION**
