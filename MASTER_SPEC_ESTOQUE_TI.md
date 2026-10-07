# MASTER SPEC --- Estoque TI

**Produto:** Estoque TI\
**Subtítulo:** Gestão de ativos e materiais de TI\
**Versão da especificação:** V1.0\
**Status:** Especificação funcional revisada e congelada para implementação\
**Objetivo deste documento:** ser a fonte única de verdade para
implementação, testes e validação do sistema. O Codex não deve criar
regras de negócio que contradigam este documento nem ampliar o escopo
sem decisão explícita do responsável pelo projeto.

------------------------------------------------------------------------

## 1. Objetivo

O Estoque TI é uma aplicação web para gestão do estoque físico de TI,
substituindo controles dispersos em planilhas e controles locais.

O sistema deve controlar:

-   ativos individualizados;
-   materiais controlados por quantidade;
-   posições físicas de estoque;
-   reservas;
-   entradas, saídas e movimentações;
-   ciclo de vida dos ativos;
-   triagem;
-   manutenção;
-   descarte;
-   inventário;
-   estoque mínimo;
-   etiquetas;
-   histórico e auditoria.

### 1.1 Princípios

1.  **Integridade acima de conveniência.** Em caso de dúvida sobre o
    resultado ou estado atual de uma operação, preservar a integridade
    do estoque e exigir nova validação.
2.  **Histórico imutável.** Eventos realizados nunca são reescritos ou
    excluídos. Correções geram novos eventos.
3.  **Scanner-first, não scanner-only.** O sistema é otimizado para
    leitor físico, mas deve funcionar também com câmera e
    pesquisa/entrada controlada.
4.  **Estado atual + histórico.** O estado atual deve ser armazenado de
    forma eficiente, sem reconstrução integral a partir dos eventos.
5.  **Transações atômicas.** Estado atual e histórico devem ser
    atualizados na mesma transação quando fizerem parte da mesma
    operação.
6.  **Backend como autoridade.** Regras, permissões e concorrência não
    podem depender apenas da interface.
7.  **Simplicidade operacional.** Evitar workflows, confirmações e
    estados que não tragam ganho real de controle.
8.  **V1 desacoplada da infraestrutura futura.** A aplicação começa em
    GitHub Pages + Supabase, mas deve poder migrar para infraestrutura
    interna.

------------------------------------------------------------------------

## 2. Escopo da V1

### 2.1 Incluído

-   Dashboard operacional.
-   Cadastro e consulta de ativos.
-   Cadastro e consulta de materiais.
-   Estrutura hierárquica de posições de estoque.
-   Localizações operacionais do terminal.
-   Scanner contextual.
-   Entrada, saída e movimentação de materiais.
-   Movimentação de ativos.
-   Reservas com carrinho.
-   Em uso e retirada temporária.
-   Triagem.
-   Manutenção.
-   Descarte e retirada física.
-   Inventário.
-   Solicitação e aprovação de ajustes.
-   Divergências.
-   Estoque mínimo.
-   Alertas por e-mail.
-   Fila e reimpressão de etiquetas.
-   QR de ativos/materiais.
-   Code 128 de posições.
-   Login por usuário/senha.
-   Login por QR de crachá.
-   Perfis e permissões estruturais.
-   Auditoria imutável.
-   Responsividade para desktop, tablet e celular.
-   Leitura pela câmera.

### 2.2 Fora do escopo

-   AD/SSO corporativo.
-   GLPI.
-   NAVIS ou outras integrações corporativas.
-   Aplicativo Android nativo.
-   PWA/offline.
-   Sincronização offline.
-   Fotos de ativos.
-   Capacidade volumétrica automática de armários.
-   Múltiplas posições simultâneas para um mesmo material.
-   Expiração automática de reservas.
-   Workflow multinível de ajustes.
-   Previsão de retorno obrigatória em retirada temporária.
-   Geração automática de hostname.
-   Inferência de localização pelo hostname.
-   Consulta de produto/fabricante pela internet.
-   Matriz de permissões editável por usuário.
-   Backup próprio da aplicação na V1.
-   Impressão da etiqueta de hostname.
-   Fallback automático de múltiplas posições preferenciais.
-   Hardcode da estrutura física Armário/Prateleira/Lado.

------------------------------------------------------------------------

## 3. Arquitetura técnica V1

### 3.1 Stack

-   **Frontend:** React + TypeScript + Vite.
-   **Hospedagem inicial:** GitHub Pages.
-   **Código/versionamento:** GitHub.
-   **CI/CD:** GitHub Actions.
-   **Backend/plataforma:** Supabase.
-   **Banco:** PostgreSQL.
-   **Autenticação:** Supabase Auth + camada própria para QR de crachá.
-   **Autorização:** perfis estruturais + RLS + validação server-side.
-   **Operações críticas:** funções transacionais/RPC e Edge Functions
    quando apropriado.
-   **E-mail de teste:** Resend, abstraído para futura substituição.
-   **Etiquetas:** QR, Code 128 e PDF A4.
-   **Ambientes:** Homologação e Produção separados.
-   **Schema:** migrations versionadas no Git.

### 3.2 Regras arquiteturais

-   Nenhum segredo deve ficar no frontend ou repositório público.
-   Service role, credenciais de e-mail e segredos ficam exclusivamente
    no backend.
-   Operações críticas não devem ser implementadas como UPDATE direto do
    navegador.
-   Mudança de estado + evento correspondente devem ocorrer
    atomicamente.
-   Migrations são a fonte de verdade estrutural do banco.
-   Alterações manuais de schema fora das migrations devem ser evitadas.
-   A aplicação não pode depender de funcionalidade específica do GitHub
    Pages para regras de negócio.
-   O mecanismo de e-mail deve ser abstraído para futura troca por
    SMTP/serviço corporativo.

### 3.3 Migração futura

A arquitetura deve permitir:

-   frontend em servidor interno;
-   PostgreSQL próprio;
-   backend interno;
-   serviço corporativo de e-mail;
-   futura integração AD/SSO.

A migração não deve exigir reescrita das regras de negócio.

------------------------------------------------------------------------

## 4. Conceitos centrais

### 4.1 Ativo

Item individualmente rastreado.

Exemplos:

-   notebook;
-   desktop;
-   monitor;
-   switch;
-   câmera;
-   servidor;
-   tablet;
-   telefone.

Possui ID único, condição, status, posição/localização e histórico.

### 4.2 Material

Item controlado por quantidade.

Exemplos:

-   conectores RJ45;
-   patch cords;
-   cabos;
-   adaptadores;
-   toner;
-   tinta;
-   sensores tratados como consumíveis.

Não possui ciclo de vida individual por unidade.

### 4.3 Posição de estoque

Local físico dentro do estoque da TI.

Exemplo:

`Armário 4 → Prateleira 2 → Lado A`

Possui código `POS-xxxxx`.

### 4.4 Localização

Local operacional de uso/destino no terminal.

Exemplos:

-   Gate 01;
-   Financeiro;
-   Scanner;
-   Balança;
-   Administrativo.

Localização não é posição de estoque.

### 4.5 Fornecedor

Empresa externa utilizada para manutenção.

Fornecedor não é Localização e não é o perfil excepcional Terceiro.

------------------------------------------------------------------------

## 5. Identificadores

### 5.1 Formatos

-   Ativo: `A-xxxxx`
-   Material: `M-xxxxx`
-   Posição: `POS-xxxxx`

IDs são opacos e não carregam significado de negócio.

### 5.2 QR de ativo/material

Conteúdo:

`A-00321`

ou:

`M-00042`

Sem URL, JSON, nome, localização ou ação embutida.

Etiqueta:

-   QR;
-   ID legível abaixo.

### 5.3 Posição

Utilizar **Code 128**, não QR.

Conteúdo:

`POS-00047`

Abaixo, quando couber:

`Armário 4 · P2 · A`

------------------------------------------------------------------------

## 6. Estrutura física de estoque

A estrutura deve ser uma árvore hierárquica dinâmica.

Exemplos válidos:

-   Armário → Prateleira → Lado.
-   Armário → Prateleira.
-   Armário → Gaveta.
-   Rack → Gaveta.
-   Armário → Caixa → Divisão.

### 6.1 Modelo

Conceitualmente:

-   id;
-   code;
-   name;
-   parent_id;
-   active;
-   timestamps.

### 6.2 Regras

-   Não hardcodar níveis.
-   Uma posição com itens não pode ser desativada.
-   Uma posição referenciada como preferencial ou triagem não pode ser
    desativada até a configuração ser alterada.
-   Histórico nunca perde a referência de posições antigas.
-   Itens devem ser movidos antes da desativação de uma POS ocupada.
-   Um ativo/material possui apenas uma POS física ativa por vez na V1.
-   Material não pode ter saldo distribuído entre múltiplas POS.

------------------------------------------------------------------------

## 7. Categorias

Campos:

-   Nome \*.
-   Ativo/Inativo.
-   Posição preferencial opcional.
-   Exigir triagem no cadastro.
-   Exigir triagem no retorno de uso.
-   Posição de triagem, obrigatória quando alguma regra de triagem
    estiver habilitada.
-   Exigir hostname ao colocar Em uso.
-   Observação opcional.

### 7.1 Regras

-   Não existe "Aplicável a Ativo/Material/Ambos".
-   Categoria não restringe fisicamente onde um item pode ser
    armazenado.
-   Regras determinam comportamento, sem hardcode de Notebook/Desktop.
-   Posição preferencial é uma conveniência operacional, não um requisito. Quando não definida, a interface deve exibir **Não definida** de forma neutra e exigir POS no armazenamento.
-   Alterar a posição preferencial não movimenta itens já armazenados; afeta apenas sugestões futuras.
-   Categoria usada pode ser desativada.
-   Categoria desativada não aparece em novos cadastros, mas permanece
    nos itens históricos/atuais.

------------------------------------------------------------------------

## 8. Cadastros administrativos

### 8.1 Fabricante

-   Nome \*.
-   Ativo.

Pode ser desativado mesmo com histórico. Não aparece em novos cadastros.

### 8.2 Fornecedor

-   Nome \*.
-   CNPJ \*.
-   Endereço \*.
-   Observação opcional.
-   Ativo.

Não pode ser desativado enquanto houver ativo atualmente Em manutenção
com ele.

### 8.3 Localização

-   Nome \*.
-   Ativo.
-   Observação opcional.

Pode ser desativada mesmo com ativos atualmente associados. Ativos
antigos permanecem referenciando-a, mas ela não pode ser escolhida em
novas operações.

### 8.4 Regra geral de master data

Cadastros utilizados historicamente são desativados, não apagados.

------------------------------------------------------------------------

## 9. Cadastro de ativo

### 9.1 Campos

  Campo         Regra
  ------------- ----------------------
  Categoria     Obrigatório
  Fabricante    Obrigatório
  Modelo        Obrigatório
  Patrimônio    Opcional
  Serial        Opcional
  Service Tag   Opcional
  MAC           Opcional
  Hostname      Opcional no cadastro
  Condição      Obrigatório
  Observação    Opcional

Condições:

-   Novo.
-   Usado.
-   Avariado.

### 9.2 Código de barras de fabricante

Ao focar Serial ou Service Tag, o usuário pode utilizar scanner para
preencher o valor.

Não haverá consulta externa ao fabricante na V1.

### 9.3 Status inicial

Se Condição = Avariado, esta regra prevalece sobre a configuração normal da categoria:

-   status = Aguardando manutenção;
-   descrição do problema obrigatória;
-   POS física obrigatória;
-   nunca iniciar como Disponível.

Caso contrário, se categoria exige triagem no cadastro:

-   status = Triagem;
-   exigir POS de triagem.

Caso contrário:

-   status = Disponível;
-   se houver posição preferencial, mostrá-la como sugestão e permitir Confirmar armazenamento ou Escolher outro local;
-   se não houver posição preferencial, exibir **Posição preferencial: Não definida** e exigir que o operador informe/escaneie uma POS válida antes de concluir.

### 9.4 Pós-cadastro

Ações:

-   **Finalizar**.
-   **Cadastrar outro igual**.
-   **Cadastrar outro**.

"Cadastrar outro igual" mantém:

-   Categoria;
-   Fabricante;
-   Modelo;
-   Condição.

Limpa:

-   Patrimônio;
-   Serial;
-   Service Tag;
-   MAC;
-   Hostname;
-   Observação.

A posição é recalculada pelas regras da categoria, sem herdar exceção de
armazenamento anterior.

### 9.5 Etiqueta

Ao salvar:

-   gerar ID;
-   adicionar etiqueta à fila de impressão.

------------------------------------------------------------------------

## 10. Cadastro de material

Campos:

-   Nome \*.
-   Categoria \*.
-   Fabricante \*.
-   Quantidade inicial \*; aceita 0.
-   Modelo opcional.
-   Observação opcional.

### 10.1 Unidade

Todo material possui unidade base.

Padrão:

`Unidade`

Admin/Controlador pode alterar para:

-   Metro;
-   Rolo;
-   Caixa;
-   Pacote;
-   outras unidades administradas.

### 10.2 Quantidade inicial

A quantidade inicial deve criar um movimento imutável de **Entrada
inicial**.

Não simplesmente preencher saldo.

### 10.3 Armazenamento e pós-cadastro

A posição sugerida do material é obtida pela posição preferencial configurada em sua categoria.

Se houver posição preferencial:

-   mostrar a posição sugerida;
-   permitir Confirmar armazenamento;
-   permitir Escolher outro local e escanear uma POS válida.

Se não houver posição preferencial:

-   exibir **Posição preferencial: Não definida** de forma neutra;
-   exigir que o operador informe/escaneie uma POS válida para concluir o armazenamento.

A regra vale mesmo quando a quantidade inicial for 0. Alterar posteriormente a posição preferencial da categoria não movimenta materiais existentes.

Após concluir:

-   Finalizar.
-   Cadastrar outro material.

Não existe "Cadastrar outro igual" para material.

------------------------------------------------------------------------

## 11. Pacotes de materiais

O saldo sempre é armazenado na unidade base.

Entrada padrão:

`Quantidade recebida: 80 unidades`

Opcional:

`Informar por pacotes`

Cálculo:

`pacotes × quantidade por pacote = unidades base`

Admin/Controlador pode configurar pacote padrão.

A quantidade por pacote pode ser sobrescrita em uma movimentação sem
alterar a configuração permanente.

------------------------------------------------------------------------

## 12. Condição e status de ativo

### 12.1 Condição

-   Novo.
-   Usado.
-   Avariado.

Avariado nunca pode ficar:

-   Disponível;
-   Reservado;
-   Em uso;
-   Retirada temporária.

Descartado pode ser Usado ou Avariado.

### 12.2 Status

-   Disponível.
-   Reservado.
-   Em uso.
-   Retirada temporária.
-   Triagem.
-   Aguardando manutenção.
-   Em manutenção.
-   Descartado.

"Fora do estoque" não é status.

------------------------------------------------------------------------

## 13. Matriz de transições

  -----------------------------------------------------------------------
  Status atual                        Transições permitidas
  ----------------------------------- -----------------------------------
  Triagem                             Disponível / Aguardando manutenção
                                      / Descartado

  Disponível                          Reservado / Em uso / Retirada
                                      temporária / Aguardando manutenção
                                      / Descartado

  Reservado                           Em uso / Disponível / Aguardando
                                      manutenção / Descartado

  Em uso                              Triagem / Disponível / Aguardando
                                      manutenção

  Retirada temporária                 Triagem / Disponível / Aguardando
                                      manutenção

  Aguardando manutenção               Em manutenção / Descartado

  Em manutenção                       Triagem / Disponível / Aguardando
                                      manutenção

  Descartado                          nenhuma transição normal
  -----------------------------------------------------------------------

As transições dependem das regras de condição e categoria.

------------------------------------------------------------------------

## 14. Triagem

Triagem representa equipamento sob responsabilidade da TI para:

-   avaliação;
-   preparação;
-   configuração;
-   formatação;
-   imagem;
-   validação.

### 14.1 Saídas

Triagem → Disponível:

-   após preparação;
-   usar posição preferencial.

Triagem → Aguardando manutenção:

-   condição = Avariado;
-   descrição do problema obrigatória;
-   escanear POS física real.

Triagem → Descartado:

-   aplicar regras de descarte.

Não criar micro-statuses de triagem.

------------------------------------------------------------------------

## 15. Em uso

Disponível → Em uso.

Campos:

-   Localização \*.
-   Hostname \*, somente se a categoria exigir e estiver vazio.
-   Chamado opcional.
-   Observação opcional.

Se hostname já existir:

-   mostrar valor atual;
-   permitir alteração.

Alteração de hostname deve gerar histórico old → new.

### 15.1 Retorno de uso

Se categoria exige triagem no retorno:

-   Em uso → Triagem;
-   escanear POS de triagem.

Se não exige e está utilizável:

-   Em uso → Disponível;
-   usar posição preferencial ou exceção informada.

Se retornar Avariado:

-   Em uso → Aguardando manutenção;
-   condição Avariado;
-   descrição do problema;
-   POS física.

Não permitir descarte direto enquanto o ativo ainda estiver fisicamente
Em uso.

------------------------------------------------------------------------

## 16. Retirada temporária

Disponível → Retirada temporária.

Campos:

-   Destino/Localização \*.
-   Chamado opcional.
-   Observação opcional.

Usuário da operação é o usuário autenticado.

Não existe previsão de retorno obrigatória na V1.

### 16.1 Retorno

Mesmas regras de retorno de Em uso:

-   Triagem, se categoria exigir;
-   Disponível, se utilizável e sem triagem;
-   Aguardando manutenção, se Avariado.

Não permitir descarte direto enquanto fisicamente fora da TI.

------------------------------------------------------------------------

## 17. Manutenção

### 17.1 Aguardando manutenção

Significa:

-   ativo Avariado;
-   fisicamente com a TI;
-   aguardando envio.

Obrigatórios:

-   Descrição do problema \*.
-   POS física \*.

Opcional:

-   Chamado.

Condição passa automaticamente para Avariado.

Não usar posição preferencial automaticamente.

### 17.2 Envio ao fornecedor

Aguardando manutenção → Em manutenção.

Obrigatório:

-   Fornecedor \*.

Opcional:

-   Chamado.

Ao enviar:

-   remover POS física ativa;
-   registrar duração de espera;
-   iniciar duração de manutenção.

### 17.3 Retorno

Condição após manutenção obrigatória:

-   Usado;
-   Avariado.

Nunca Novo.

Se Usado e categoria exige triagem no retorno:

-   Em manutenção → Triagem;
-   POS de triagem.

Se Usado e não exige:

-   Em manutenção → Disponível;
-   posição preferencial ou exceção.

Se Avariado:

-   Em manutenção → Aguardando manutenção;
-   POS física;
-   pode depois ser reenviado ou descartado.

Observação opcional.

Não permitir descarte direto enquanto o ativo ainda estiver fisicamente
no fornecedor.

------------------------------------------------------------------------

## 18. Descarte

Para descartar, o ativo deve estar sob controle físico da TI.

Obrigatórios:

-   Motivo \*.
-   POS física \*.

Opcional:

-   Chamado.

Status:

-   Descartado.

Pode permanecer fisicamente armazenado aguardando coleta.

### 18.1 Retirada física

Ação:

`Registrar retirada física`

Ao executar:

-   manter status Descartado;
-   remover POS ativa;
-   registrar usuário;
-   data/hora;
-   chamado opcional;
-   observação opcional.

Depois da retirada física:

-   não pode ser movido.

Não existe reversão normal de Descartado.

Correção administrativa excepcional deve gerar novo evento auditável,
nunca apagar histórico.

------------------------------------------------------------------------

## 19. Ativo reservado com defeito

Reservado pode ir diretamente para:

-   Aguardando manutenção;
-   Descartado.

Ao fazer isso:

-   remover automaticamente o item da reserva;
-   atualizar estado do item da reserva;
-   se não houver mais itens pendentes, encerrar a reserva;
-   aplicar campos obrigatórios do destino.

------------------------------------------------------------------------

## 20. Materiais --- saldos

Para cada material:

-   Estoque físico.
-   Reservado.
-   Disponível.

Fórmula:

`Disponível = max(0, Físico - Reservado)`

Se Reservado \> Físico:

-   Disponível = 0;
-   exibir déficit;
-   gerar divergência crítica.

Estoque físico nunca pode ficar negativo.

------------------------------------------------------------------------

## 21. Entrada de material

Obrigatório:

-   Quantidade \*.

Opcional:

-   Pacotes.
-   Chamado.
-   Observação.

Entrada aumenta estoque físico.

Não perguntar POS novamente em uma entrada normal.

------------------------------------------------------------------------

## 22. Saída de material

Obrigatório:

-   Quantidade \*.

Opcional para Admin/Controlador/TI:

-   Chamado.
-   Observação.

Para Monitoramento/Terceiro:

-   Observação é obrigatória.

Saída normal só pode consumir **Disponível**.

Nunca consome quantidade reservada.

------------------------------------------------------------------------

## 23. Movimentação

### 23.1 Ativo

Fluxo:

1.  identificar ativo;
2.  Mover;
3.  sistema entra em contexto de POS;
4.  usuário escaneia `POS-*`;
5.  posição válida completa imediatamente a movimentação.

Sem confirmação adicional.

Permitido quando ativo possui POS física ativa, por exemplo:

-   Disponível;
-   Reservado;
-   Triagem;
-   Aguardando manutenção;
-   Descartado ainda armazenado.

Não permitido quando:

-   Em uso;
-   Retirada temporária;
-   Em manutenção;
-   Descartado com retirada física registrada.

### 23.2 Material

Mover altera apenas POS.

Não altera saldo.

------------------------------------------------------------------------

## 24. Reservas

Reserva funciona como **carrinho**.

### 24.1 Nova reserva

Campos:

-   Solicitante \*.
-   Chamado opcional.
-   Observação opcional.

`Criada por` é preenchido pelo usuário autenticado e é diferente de
Solicitante.

Solicitante pode ser texto livre e não precisa possuir usuário no
sistema.

### 24.2 Carrinho

Pode conter simultaneamente:

-   ativos específicos;
-   materiais com quantidade.

Scanner no carrinho aceita:

-   `A-*`;
-   `M-*`.

Também deve ser possível adicionar por pesquisa.

Ativo:

-   confirmação de inclusão;
-   quantidade implicitamente 1.

Material:

-   solicitar quantidade.

### 24.3 Atalho Reservar

Ação Reservar a partir de um ativo/material abre **o mesmo fluxo de Nova
Reserva**, já com o item no carrinho.

Não existe um segundo mecanismo de reserva.

### 24.4 Confirmação

Enquanto o usuário monta o carrinho, nada está efetivamente reservado.

Somente ao clicar **Confirmar reserva**:

-   backend revalida todos os itens;
-   ativos tornam-se Reservados;
-   reservado de materiais aumenta;
-   físico de materiais não muda;
-   disponível diminui.

Se algum item ficou indisponível durante a montagem, a confirmação deve
falhar de forma clara e permitir correção.

### 24.5 Status

Reserva:

-   Aberta.
-   Encerrada.

Item:

-   Pendente.
-   Entregue.
-   Cancelado.

A reserva encerra automaticamente quando não houver item pendente.

### 24.6 Cancelamento

Cancelar ativo:

-   libera ativo;
-   normalmente retorna para Disponível.

Cancelar material:

-   libera quantidade reservada;
-   pode reduzir parcialmente a quantidade reservada.

Não permitir aumentar quantidade pelo fluxo de cancelamento.

### 24.7 Saída de reserva

Abrir reserva → Dar saída.

Permitir seleção múltipla.

Ativos:

-   selecionar itens exatos.

Materiais:

-   selecionar;
-   informar quantidade de saída;
-   saída parcial permitida;
-   restante continua reservado.

Saída normal fora da reserva nunca consome reservado.

------------------------------------------------------------------------

## 25. Estoque mínimo

Configuração administrativa de materiais:

-   Unidade base.
-   Pacote padrão opcional.
-   Estoque mínimo habilitado/desabilitado.
-   Valor mínimo.

O cálculo utiliza **Disponível**, não apenas físico.

Filtro de materiais:

`Abaixo do mínimo: Ambos / Sim / Não`

### 25.1 Alerta

Gerar alerta somente ao cruzar:

`Disponível >= mínimo` → `Disponível < mínimo`

Não repetir alerta em toda movimentação enquanto continuar abaixo.

Após normalizar, uma futura nova queda pode gerar novo alerta.

E-mail deve conter:

-   material;
-   físico;
-   reservado;
-   disponível;
-   mínimo.

Alertas não bloqueiam operações.

------------------------------------------------------------------------

## 26. Ajuste de estoque

### 26.1 TI

TI pode abrir **Ajustar estoque**, mas não altera saldo diretamente.

Campos:

-   Quantidade física encontrada \*.
-   Motivo \*.

Cria solicitação:

`AJ-xxxxx`

Status:

-   Pendente.

### 26.2 Admin/Controlador

Ao usar Ajustar estoque:

-   podem confirmar ajuste diretamente.

Também podem analisar solicitações de TI:

-   Aprovar.
-   Recusar.

### 26.3 Estados

-   Pendente.
-   Aprovada.
-   Recusada.
-   Cancelada.

### 26.4 Invalidação automática

Qualquer operação que altere o **estoque físico** do material cancela
automaticamente solicitações pendentes daquele material.

Motivo:

`Estoque alterado após a solicitação de ajuste. É necessária uma nova conferência física.`

Mudança apenas em Reservado não cancela a solicitação.

### 26.5 Concorrência

Ao aprovar, backend deve validar novamente:

-   solicitação ainda Pendente;
-   estado-base ainda válido.

A solicitação representa a quantidade física encontrada, não uma
instrução cega de somar/subtrair diferença antiga.

### 26.6 Ajuste e reservas

Se um ajuste verdadeiro resultar em:

`Físico < Reservado`

não bloquear o ajuste.

Registrar a verdade física e gerar divergência.

------------------------------------------------------------------------

## 27. Divergências

Tela administrativa de divergências sistêmicas.

Caso principal:

`Reservado > Físico`

Exibir:

-   material;
-   físico;
-   reservado;
-   disponível = 0;
-   déficit;
-   reservas afetadas.

Não:

-   cancelar reserva automaticamente;
-   reduzir reserva automaticamente;
-   fabricar saldo.

Quando resolvida, deixa de aparecer como ativa, mas histórico permanece.

------------------------------------------------------------------------

## 28. Inventário

### 28.1 Início

Pode iniciar por:

-   dropdown hierárquico de posições;
-   scan de POS.

Se scan:

`Iniciar inventário nesta posição?`

Permitir inventário:

-   de posição terminal;
-   de posição pai/armário, incluindo descendentes.

### 28.2 Sessão

Estados:

-   Em andamento.
-   Finalizado.

Sessão Em andamento deve ser persistida e retomável.

Exibir:

-   progresso;
-   posições;
-   ativos;
-   materiais;
-   divergências;
-   última atualização.

### 28.3 Ativos

Confirmados por:

-   scanner;
-   câmera.

Se ativo estiver cadastrado em outra POS:

-   mostrar posição registrada;
-   posição encontrada;
-   permitir Registrar nesta posição ou Ignorar.

Correção de posição gera movimentação auditada.

Ativo esperado e não encontrado:

-   registrar divergência de inventário;
-   não remover POS automaticamente.

### 28.4 Materiais

Usuário informa contagem física.

Comparar:

-   sistema;
-   físico contado.

TI:

-   divergência gera solicitação de ajuste vinculada ao inventário.

Admin/Controlador:

-   pode confirmar/aplicar ajuste.

### 28.5 Movimento após contagem

Se item contado for movimentado depois:

-   marcar como necessitando reconferência;
-   não aplicar contagem antiga silenciosamente.

Inventário não bloqueia operações normais.

------------------------------------------------------------------------

## 29. Scanner contextual

Todos os meios de leitura alimentam a mesma camada de validação:

-   leitor 2D físico;
-   câmera;
-   entrada controlada.

### 29.1 Tipos

-   `A-*` = ativo.
-   `M-*` = material.
-   `POS-*` = posição.
-   QR de usuário = token de autenticação.

### 29.2 Contexto

Cada operação define tipos aceitos.

Exemplo Mover:

-   aceita POS;
-   rejeita A/M/usuário.

Mensagem:

`Código inválido. Escaneie uma posição de estoque.`

A operação permanece aberta.

### 29.3 Validação

Validar:

1.  formato;
2.  existência;
3.  ativo/inativo;
4.  estado/regra de negócio.

Exemplos:

-   `Posição não encontrada.`
-   `Posição inativa. Selecione outra posição.`
-   `Ativo não encontrado.`

Código inexistente **não oferece cadastro automático**.

### 29.4 Scanner físico x digitação

Leitor físico se comporta como teclado.

Detecção pode usar:

-   velocidade entre teclas;
-   Enter terminador;
-   padrão válido.

Threshold deve ser configurável.

Campo de pesquisa continua aceitando digitação humana normalmente.

### 29.5 Duplo BIP

Leituras idênticas em intervalo muito curto devem sofrer debounce.

Não utilizar bloqueio longo que impeça nova leitura legítima do mesmo
item.

Leitura de item diferente deve funcionar imediatamente.

------------------------------------------------------------------------

## 30. Câmera

Em tablet/mobile disponibilizar:

`Escanear com câmera`

Deve ler:

-   QR;
-   Code 128.

Resultado entra no mesmo scanner contextual.

------------------------------------------------------------------------

## 31. Tela principal

Dashboard resumido.

Cards:

1.  **Ativos disponíveis** --- total + principais categorias e
    `+N outros`.
2.  **Reservas ativas**.
3.  **Em triagem**.
4.  **Manutenção** --- total + aguardando/no fornecedor.
5.  **Retiradas temporárias**.
6.  **Abaixo do mínimo**.

Cards são clicáveis e levam a listas filtradas.

### 31.1 Scanner principal

Área de scanner/pesquisa é prioritária.

Ativo escaneado:

-   Alterar status.
-   Mover.
-   Detalhes.

Material escaneado:

-   Entrada.
-   Saída.
-   Reservar.
-   Mover.
-   Detalhes.

### 31.2 Sucesso

Após operação:

-   exibir confirmação visual por aproximadamente 2 segundos;
-   sem progress bar/countdown;
-   scanner continua ativo;
-   novo BIP interrompe a confirmação e abre o próximo item;
-   sem botão "Escanear próximo".

Sem nova leitura, retornar silenciosamente à estação de scanner.

### 31.3 Últimas movimentações

Mostrar últimas 5 + `Ver todas`.

------------------------------------------------------------------------

## 32. Navegação principal

Ordem:

1.  Início.
2.  Ativos.
3.  Materiais.
4.  Cadastrar.
5.  Reservas.
6.  Inventário.
7.  Movimentações.
8.  Administração, conforme permissão.

Topo:

-   pesquisa global;
-   usuário/perfil;
-   Sair.

Utilizar breadcrumbs em detalhes/administração.

Inventário existe apenas como operação no menu principal, não duplicado
dentro da Administração.

------------------------------------------------------------------------

## 33. Pesquisa

Pesquisa global por:

-   ID;
-   nome;
-   categoria;
-   fabricante;
-   modelo;
-   patrimônio;
-   serial;
-   Service Tag;
-   MAC;
-   hostname;
-   chamado;
-   POS;
-   localização.

Resultados podem ser agrupados em:

-   Ativos;
-   Materiais;
-   Reservas;
-   Movimentações.

### 33.1 Filtros de ativos

-   busca;
-   categoria;
-   status;
-   condição;
-   POS;
-   localização;
-   fabricante.

### 33.2 Filtros de materiais

-   busca;
-   categoria;
-   fabricante;
-   POS;
-   Abaixo do mínimo: Ambos / Sim / Não.

------------------------------------------------------------------------

## 34. Detalhes de material

Exibir:

-   nome;
-   ID;
-   categoria;
-   fabricante;
-   modelo;
-   unidade;
-   POS;
-   físico;
-   reservado;
-   disponível;
-   mínimo;
-   reservas ativas;
-   movimentações;
-   histórico.

Ações conforme permissão:

-   Entrada.
-   Saída.
-   Reservar.
-   Mover.
-   Ajustar estoque.
-   Editar cadastro.

Para TI, Ajustar estoque gera solicitação.

Para Admin/Controlador, ajuste pode ser direto.

------------------------------------------------------------------------

## 35. Detalhes de ativo

Exibir:

-   ID;
-   categoria;
-   fabricante;
-   modelo;
-   patrimônio;
-   serial;
-   Service Tag;
-   MAC;
-   hostname;
-   condição;
-   status;
-   POS/localização atual;
-   observação;
-   reserva;
-   manutenção;
-   timeline/histórico.

Detalhes são consulta.

Editar cadastro é ação separada e restrita.

Não permitir edição arbitrária de:

-   status;
-   saldo;
-   histórico.

------------------------------------------------------------------------

## 36. Hostname

ID do ativo e hostname são conceitos separados.

Hostname:

-   mutável;
-   opcional no cadastro;
-   pode ser obrigatório ao colocar Em uso conforme categoria.

Sistema:

-   armazena valor atual;
-   registra histórico;
-   não imprime etiqueta de hostname;
-   não interpreta hostname para inferir localização.

Alterações:

-   valor A → B gera evento;
-   valor B → vazio gera evento;
-   salvar sem mudança não gera evento.

------------------------------------------------------------------------

## 37. Etiquetas

### 37.1 Impressão

Inicialmente:

-   A4 adesivo;
-   sempre folha nova;
-   sem grid fixo;
-   distribuir etiquetas compactamente;
-   corte manual.

Não implementar reaproveitamento de folha parcialmente utilizada.

### 37.2 Fila

Novas etiquetas entram em fila.

Usuário pode acumular e gerar PDF.

Após gerar PDF, não marcar automaticamente como impresso.

Usuário confirma:

-   impressão realizada;
-   ou mantém em fila.

### 37.3 Reimpressão

Reimpressão:

-   não cria novo ID;
-   fica registrada.

### 37.4 Impressora futura

Arquitetura deve permitir futura impressora térmica individual sem mudar
IDs.

### 37.5 Teste físico

Critério de aceite inclui impressão em tamanho real e leitura em
distância/ângulo operacional.

Legibilidade tem prioridade sobre estética.

------------------------------------------------------------------------

## 38. Autenticação

### 38.1 Usuário/senha

Interface:

-   usuário;
-   senha.

Pode existir adaptação interna necessária ao Supabase Auth, sem expor
e-mail como conceito obrigatório ao operador. A identidade técnica necessária
ao provedor deve ser abstraída da UX. Criação, reset, desativação e demais
operações privilegiadas de usuários devem ocorrer server-side; nenhuma
credencial administrativa do Supabase pode ser exposta ao navegador.

### 38.2 QR de crachá

Tela de login escuta globalmente:

`Bipe seu crachá para entrar.`

Não exigir clique prévio em botão.

QR contém somente token aleatório compacto.

Não conter:

-   nome;
-   usuário;
-   senha;
-   matrícula;
-   perfil;
-   URL;
-   JSON.

Token deve ser criptograficamente imprevisível.

Preferir armazenamento seguro/hash no banco. O token do QR é uma credencial
para iniciar a autenticação: deve ser validado pelo backend, que então
estabelece uma sessão segura. O token impresso não deve funcionar diretamente
como JWT ou sessão permanente.

### 38.3 Gerar novo QR

Administração de usuário possui:

`Gerar novo QR`

Ao gerar:

-   invalidar imediatamente todos os QR anteriores;
-   apenas novo token permanece válido.

Não existe botão separado "Revogar QR".

### 38.4 Etiqueta de crachá

Somente QR.

Sem nome abaixo.

Deve ser pequeno o suficiente para adesivo no crachá e fisicamente
testado com o scanner.

------------------------------------------------------------------------

## 39. Sessão

Botão:

`Sair`

Logout automático após **10 minutos de inatividade**.

Valor deve ser tecnicamente configurável no futuro.

Atividade:

-   mouse;
-   teclado;
-   scanner;
-   navegação/operação.

Se sessão expirar durante operação não confirmada:

-   descartar dados não salvos.

Inventário Em andamento permanece salvo.

Se outro QR de usuário for escaneado enquanto alguém está autenticado:

-   não trocar usuário silenciosamente;
-   usuário atual deve sair primeiro.

------------------------------------------------------------------------

## 40. Acesso excepcional

Monitoramento e Terceiro não possuem usuário individual, QR de crachá ou senha individual. O acesso excepcional é protegido por um **PIN compartilhado**, inicialmente `5555`.

Tela:

-   Acesso excepcional → Monitoramento.
-   Acesso excepcional → Terceiro.
-   solicitar PIN antes de iniciar a sessão excepcional.

O mesmo PIN é utilizado para os dois acessos, mas a sessão registra a identidade escolhida:

-   `monitoramento`;
-   `terceiro`.

### 40.1 Segurança do PIN

-   O PIN nunca pode ser validado ou armazenado em texto claro no frontend/bundle do GitHub Pages.
-   A validação deve ocorrer server-side.
-   O valor não deve aparecer em logs, auditoria ou respostas de API.
-   Admin pode alterar o PIN em Administração → Acesso → Acessos excepcionais.
-   A alteração é auditada sem registrar o valor antigo ou novo.
-   Implementar proteção server-side contra brute force, com limitação e bloqueio temporário após tentativas incorretas consecutivas.

### 40.2 Escopo

Monitoramento/Terceiro possuem acesso simplificado a materiais. Se escanearem um ativo, o sistema pode exibir identificação básica e informar que não há operações disponíveis para o perfil, sem histórico completo ou ações de ciclo de vida.

------------------------------------------------------------------------

## 41. Perfis

-   Administrador.
-   Controlador de Estoque.
-   TI.
-   Operador de Monitoramento.
-   Terceiro.

Monitoramento e Terceiro têm mesmas permissões funcionais, mas
identidade distinta no histórico.

------------------------------------------------------------------------

## 42. Matriz de permissões

  Função                              Admin   Controlador   TI   Monitoramento   Terceiro
  ---------------------------------- ------- ------------- ---- --------------- ----------
  Dashboard completo                    ✓          ✓        ✓                   
  Dashboard simplificado                                               ✓            ✓
  Pesquisa/scan                         ✓          ✓        ✓          ✓            ✓
  Detalhes completos                    ✓          ✓        ✓                   
  Detalhes básicos de material          ✓          ✓        ✓          ✓            ✓
  Histórico completo                    ✓          ✓        ✓                   
  Cadastrar ativo/material              ✓          ✓        ✓                   
  Entrada material                      ✓          ✓        ✓                   
  Saída material                        ✓          ✓        ✓          ✓            ✓
  Reserva/saída/cancelamento            ✓          ✓        ✓                   
  Alterar status de ativo               ✓          ✓        ✓                   
  Mover                                 ✓          ✓        ✓                   
  Triagem/manutenção                    ✓          ✓        ✓                   
  Descartar/retirada física             ✓          ✓        ✓                   
  Inventário                            ✓          ✓        ✓                   
  Solicitar ajuste                                          ✓                   
  Ajustar diretamente                   ✓          ✓                            
  Aprovar/recusar ajuste                ✓          ✓                            
  Editar cadastro                       ✓          ✓                            
  Gerar/reimprimir etiquetas            ✓          ✓        ✓                   
  Configurar mínimo/unidade/pacote      ✓          ✓                            
  Cadastros administrativos             ✓          ✓                            
  Configurar alertas                    ✓          ✓                            
  Usuários                              ✓                                       

Permissões devem ser validadas no backend, não apenas escondidas na UI.

Perfis são estruturais. Não haverá editor de matriz de permissões na V1.

------------------------------------------------------------------------

## 43. Administração

### 43.1 Cadastros

-   Categorias.
-   Fabricantes.
-   Fornecedores.
-   Localizações.

### 43.2 Estoque

-   Posições de estoque.
-   Materiais.
-   Ajustes de estoque.
-   Divergências.

### 43.3 Etiquetas

-   Fila de impressão.
-   Reimpressões.

### 43.4 Notificações

-   Alertas.

### 43.5 Acesso --- somente Admin

-   Usuários.
-   Acessos excepcionais: alterar PIN compartilhado de Monitoramento/Terceiro.

Não criar tela separada de Perfis.

------------------------------------------------------------------------

## 44. Alertas de e-mail

Administração → Notificações → Alertas.

Configuração:

-   habilitado/desabilitado;
-   destinatários globais;
-   Enviar e-mail de teste.

Fluxo:

1.  estoque cruza mínimo;
2.  registrar alerta;
3.  Edge Function envia;
4.  registrar sucesso/falha.

Histórico pode registrar:

-   enviado;
-   falhou;
-   tentativas;
-   erro técnico.

Permitir retry de falha.

V1 utiliza Resend para teste, mas o código deve permitir troca futura.

------------------------------------------------------------------------

## 45. Auditoria e histórico

### 45.1 Regra fundamental

Toda modificação relevante gera evento imutável.

Nenhum perfil, inclusive Admin, possui operação normal de:

-   editar histórico;
-   apagar histórico.

### 45.2 Correções

Correção gera novo evento.

Exemplo:

`Hostname A → B`

Depois:

`Hostname B → vazio`

Ambos permanecem.

### 45.3 Alteração de cadastro

Se vários campos forem alterados no mesmo save:

-   pode gerar um evento `Cadastro atualizado`;
-   evento contém cada diferença old → new.

Salvar sem alteração não gera evento.

### 45.4 Tipos de registro

Separar conceitualmente:

1.  **Histórico operacional** --- movimentos/ciclo de vida.
2.  **Auditoria administrativa** --- alterações de
    configuração/cadastro.
3.  **Log técnico** --- erros, timeout, falhas internas.

Tentativas inválidas não devem poluir timeline operacional.

------------------------------------------------------------------------

## 46. Concorrência

Backend sempre revalida o estado no momento da escrita.

### 46.1 Material

Se dois usuários visualizam 10 disponíveis:

-   primeiro retira 8;
-   segundo tenta retirar 5;
-   segundo deve falhar porque agora existem apenas 2.

Nunca permitir negativo.

### 46.2 Ativo

Se ativo muda entre abertura da tela e confirmação:

-   rejeitar operação baseada em estado antigo;
-   informar estado atual.

### 46.3 Movimento

Se a posição mudou depois que usuário iniciou Mover:

-   não sobrescrever silenciosamente;
-   informar que ativo foi alterado;
-   exigir atualização/nova operação.

------------------------------------------------------------------------

## 47. Idempotência e duplicidade

### 47.1 Botões

Após primeiro clique de ação de escrita:

-   desabilitar botão;
-   indicar processamento.

### 47.2 Idempotência

Operações críticas recebem identificador único de operação.

Se mesma operação chegar novamente:

-   não executar duas vezes;
-   devolver resultado da operação original.

### 47.3 Scanner duplicado

Aplicar debounce curto para código idêntico.

Código diferente deve ser aceito imediatamente.

------------------------------------------------------------------------

## 48. Perda de conexão

### 48.1 Antes da confirmação

Se operação não chegou ao backend:

`Sem conexão. A operação não foi registrada.`

### 48.2 Após confirmação incerta

Não assumir falha.

Exibir:

`Verificando operação...`

Consultar identificador da operação.

Se executada:

-   mostrar sucesso.

Se comprovadamente não executada:

-   permitir tentar novamente.

### 48.3 Offline

Não haverá modo offline.

Nenhuma movimentação deve ser armazenada localmente para sincronização
posterior.

------------------------------------------------------------------------

## 49. Transações

Operações compostas devem ser atômicas.

Exemplos:

-   mudança de status + evento;
-   movimento + evento;
-   reserva + itens + alteração de estado;
-   saída de material + movimento;
-   aprovação de ajuste + saldo + evento.

Ou tudo conclui, ou tudo faz rollback.

------------------------------------------------------------------------

## 50. Confirmações

### 50.1 Exigir confirmação explícita

-   Descartar ativo.
-   Registrar retirada física.
-   Aprovar ajuste.
-   Recusar ajuste.
-   Cancelar item de reserva.
-   Gerar novo QR de usuário.
-   Desativar cadastro mestre.
-   Finalizar inventário.

### 50.2 Não adicionar confirmação redundante

-   Entrada normal.
-   Saída normal.
-   Mover após POS válida.
-   Colocar Em uso.
-   Retorno normal.
-   Adicionar item ao carrinho.
-   Cadastro normal.

------------------------------------------------------------------------

## 51. Formulários não salvos

Ao tentar sair com alterações não confirmadas:

`Existem alterações não salvas. Deseja sair?`

Aplicável a:

-   cadastro;
-   reserva em montagem;
-   ajuste;
-   edição;
-   operações.

Não implementar autosave geral.

Inventário é exceção porque sessão Em andamento é persistente.

------------------------------------------------------------------------

## 52. Tratamento de erros

Nunca exibir ao usuário:

-   stack trace;
-   erro PostgreSQL;
-   constraint interna;
-   API 500 bruta.

Mensagem padrão:

`Não foi possível concluir a operação. Tente novamente. Se o problema continuar, entre em contato com a TI.`

Pode incluir código técnico:

`ERR-XXXX`

Logs técnicos devem permitir correlação pelo código.

Mensagens de negócio devem ser específicas quando possível.

------------------------------------------------------------------------

## 53. Interface e UX

### 53.1 Direção visual

-   visual corporativo moderno;
-   inspirado no HUB operacional existente;
-   cards limpos;
-   hierarquia tipográfica;
-   espaçamento adequado;
-   sombras discretas;
-   transições/microinterações discretas;
-   tabelas profissionais;
-   estados vazios tratados;
-   loading/skeleton quando necessário;
-   evitar aparência de CRUD genérico.

### 53.2 Responsividade

-   desktop-first;
-   funcional em tablet;
-   funcional em celular;
-   câmera especialmente útil em tablet/mobile.

### 53.3 Navegação pós-operação

Scanner station:

-   sucesso \~2 s;
-   retorna ao scanner.

Edição em contexto específico:

-   permanecer/retornar aos detalhes do item;
-   não mandar usuário ao Dashboard sem necessidade.

------------------------------------------------------------------------

## 54. Modelo conceitual de dados

A implementação deve partir de entidades equivalentes a:

-   profiles / vínculo de usuários;
-   categories;
-   manufacturers;
-   suppliers;
-   locations;
-   stock_positions;
-   assets;
-   materials;
-   reservations;
-   reservation_items;
-   material_movements;
-   asset_events;
-   audit_events;
-   inventory_sessions;
-   inventory_items;
-   stock_adjustment_requests;
-   divergences;
-   alert_settings;
-   alert_events;
-   print_queue;
-   operation/idempotency records quando necessário.

### 54.1 Diretrizes

-   Não criar uma tabela gigante para tudo.
-   Não criar uma tabela separada para histórico de cada campo.
-   Dados de consulta frequente devem ser estruturados.
-   JSON/metadados podem complementar eventos, não substituir modelagem
    relacional essencial.
-   Constraints importantes devem existir no banco quando possível.
-   Índices devem atender pesquisas por ID, serial, hostname, POS e
    relacionamentos principais.

------------------------------------------------------------------------

## 55. Ambientes

### 55.1 Homologação

Supabase Project HML.

Usado para:

-   desenvolvimento;
-   migrations;
-   testes;
-   dados fictícios;
-   validação.

### 55.2 Produção

Supabase Project PRD.

Alterações estruturais chegam via migrations validadas.

Codex não deve tratar Produção como ambiente primário de
desenvolvimento.

------------------------------------------------------------------------

## 56. Backup V1

Backup próprio da aplicação não é requisito bloqueante da V1.

Obrigatório:

-   migrations no Git;
-   schema versionado.

Quando houver infraestrutura corporativa própria:

-   definir política de backup;
-   restauração;
-   retenção;
-   testes de recuperação.

Exportações futuras não devem ser confundidas com backup.

------------------------------------------------------------------------

## 57. Critérios de aceite

### Scanner

**AC-SCN-001** --- Em Mover, somente `POS-*` válido e ativo é aceito.\
**AC-SCN-002** --- Código inválido não encerra o contexto de leitura.\
**AC-SCN-003** --- Scanner físico e câmera utilizam a mesma validação
contextual.\
**AC-SCN-004** --- Código inexistente informa não encontrado e não
sugere cadastro automático.\
**AC-SCN-005** --- Leitura duplicada quase simultânea não executa duas
operações.

### Reservas

**AC-RES-001** --- Um ativo não pode estar simultaneamente em duas
reservas abertas.\
**AC-RES-002** --- Reserva de material reduz Disponível, não Físico.\
**AC-RES-003** --- Saída normal não consome quantidade reservada.\
**AC-RES-004** --- Carrinho não reserva nada antes de Confirmar
reserva.\
**AC-RES-005** --- Confirmação revalida disponibilidade de todos os
itens.\
**AC-RES-006** --- Saída parcial mantém restante reservado.\
**AC-RES-007** --- Reserva encerra quando não houver item pendente.

### Estoque

**AC-STK-001** --- Estoque físico nunca fica negativo.\
**AC-STK-002** --- Disponível = max(0, Físico - Reservado).\
**AC-STK-003** --- Material possui somente uma POS ativa na V1.\
**AC-STK-004** --- Saída acima do Disponível é rejeitada no backend.\
**AC-STK-005** --- Movimento de material não altera saldo.  
**AC-STK-006** --- Categoria sem posição preferencial continua válida; armazenamento exige escolha/scan explícito de POS.  
**AC-STK-007** --- Alterar posição preferencial não movimenta itens existentes.

### Ajustes

**AC-ADJ-001** --- TI não altera saldo diretamente; gera solicitação.\
**AC-ADJ-002** --- Admin/Controlador podem ajustar diretamente.\
**AC-ADJ-003** --- Alteração do estoque físico cancela solicitação
Pendente daquele material.\
**AC-ADJ-004** --- Mudança apenas no Reservado não cancela solicitação.\
**AC-ADJ-005** --- Ajuste verdadeiro que gere Físico \< Reservado é
permitido e cria divergência.

### Ativos

**AC-AST-001** --- Ativo Avariado não pode ficar Disponível, Reservado,
Em uso ou Retirada temporária.\
**AC-AST-002** --- Retorno funcional de manutenção respeita regra de
triagem da categoria.\
**AC-AST-003** --- Ativo fisicamente fora da TI não pode ser descartado
diretamente.\
**AC-AST-004** --- Descartado após retirada física não pode ser movido.\
**AC-AST-005** --- Reservado com defeito pode ir para
manutenção/descarte e deve sair da reserva.\
**AC-AST-006** --- Ativo cadastrado como Avariado inicia em Aguardando manutenção, nunca Disponível.

### Auditoria

**AC-AUD-001** --- Nenhum perfil edita ou exclui evento histórico.\
**AC-AUD-002** --- Correção gera novo evento.\
**AC-AUD-003** --- Mudança de estado e evento são transacionais.\
**AC-AUD-004** --- Save sem alteração não cria evento.\
**AC-AUD-005** --- Alterações administrativas relevantes registram
old/new.

### Autenticação

**AC-AUTH-001** --- QR de crachá contém token opaco, não dados
pessoais/credenciais.\
**AC-AUTH-002** --- Login pode ser feito por usuário/senha ou QR.\
**AC-AUTH-003** --- Gerar novo QR invalida imediatamente os anteriores.\
**AC-AUTH-004** --- Sessão expira após 10 minutos de inatividade.\
**AC-AUTH-005** --- Scan de outro crachá durante sessão não troca
usuário silenciosamente.\
**AC-AUTH-006** --- Token do QR é validado server-side e não funciona diretamente como sessão/JWT permanente.\
**AC-AUTH-007** --- PIN excepcional é validado server-side, não é exposto no frontend e possui proteção contra brute force.

### Permissões

**AC-PERM-001** --- Permissões são validadas no backend.\
**AC-PERM-002** --- TI pode solicitar, mas não aplicar diretamente
ajuste de quantidade.\
**AC-PERM-003** --- Monitoramento/Terceiro só executam saída de material
dentro de seu escopo.\
**AC-PERM-004** --- Saída excepcional exige observação.\
**AC-PERM-005** --- Somente Admin administra usuários.

### Inventário

**AC-INV-001** --- Inventário Em andamento pode ser retomado.\
**AC-INV-002** --- Ativo ausente não perde POS automaticamente.\
**AC-INV-003** --- Movimento após contagem exige reconferência.\
**AC-INV-004** --- TI gera solicitação de ajuste para divergência
quantitativa.\
**AC-INV-005** --- Inventário não bloqueia operações normais.

### Concorrência/idempotência

**AC-CON-001** --- Backend revalida estado antes de toda escrita
crítica.\
**AC-CON-002** --- Operação duplicada com mesmo identificador não é
executada duas vezes.\
**AC-CON-003** --- Estado antigo na tela não sobrescreve silenciosamente
estado mais recente.\
**AC-CON-004** --- Resultado incerto por perda de conexão é consultado
antes de permitir repetição.

### Etiquetas

**AC-LBL-001** --- Ativos/materiais usam QR com apenas ID.\
**AC-LBL-002** --- POS usa Code 128.\
**AC-LBL-003** --- PDF A4 assume sempre folha nova.\
**AC-LBL-004** --- Gerar PDF não marca automaticamente como impresso.\
**AC-LBL-005** --- Reimpressão mantém o mesmo ID.\
**AC-LBL-006** --- Etiquetas devem passar por teste físico de leitura.

------------------------------------------------------------------------

## 58. Estratégia de implementação

### Fase 1 --- Fundação

-   React + TypeScript + Vite.
-   Estrutura do repositório.
-   GitHub Pages.
-   Supabase HML.
-   Migrations.
-   Layout principal.
-   Auth.
-   Usuários.
-   Perfis/permissões.
-   Cadastros-base.

### Fase 2 --- Núcleo do estoque

-   Posições hierárquicas.
-   Categorias.
-   Fabricantes.
-   Localizações.
-   Ativos.
-   Materiais.
-   Cadastro.
-   Scanner contextual.
-   Detalhes.
-   Entrada/saída.
-   Mover.
-   Histórico básico.

### Fase 3 --- Ciclo de vida

-   Em uso.
-   Retirada temporária.
-   Triagem.
-   Aguardando manutenção.
-   Em manutenção.
-   Descartado.
-   Fornecedores.
-   Transições e validações.

### Fase 4 --- Reservas

-   Carrinho.
-   Ativos + materiais.
-   Solicitante.
-   Confirmação.
-   Concorrência.
-   Saída parcial.
-   Cancelamento.
-   Encerramento automático.

### Fase 5 --- Controle

-   Ajuste direto.
-   Solicitação.
-   Aprovação/recusa.
-   Cancelamento automático.
-   Divergências.
-   Inventário.
-   Mínimo.
-   Alertas/e-mail.

### Fase 6 --- Etiquetas e acabamento

-   QR.
-   Code 128.
-   Fila.
-   PDF A4.
-   Reimpressão.
-   QR de usuário.
-   Câmera.
-   Responsividade.
-   Microinterações.
-   Dashboard final.

### Fase 7 --- Hardening e testes

-   Concorrência real.
-   Idempotência.
-   RLS.
-   Permissões.
-   Transações.
-   Falhas de conexão.
-   Scanner duplicado.
-   Testes de fluxos completos.
-   Revisão visual.
-   Preparação de PRD.

------------------------------------------------------------------------

## 59. Definition of Done por fase

Uma fase só pode ser considerada concluída quando:

1.  funcionalidades previstas estão implementadas;
2.  migrations estão versionadas;
3.  permissões são validadas no backend;
4.  critérios de aceite aplicáveis passam;
5.  não há erros técnicos expostos ao usuário;
6.  fluxos principais foram testados manualmente;
7.  não existem regressões conhecidas nas fases anteriores;
8.  documentação relevante foi atualizada;
9.  não foram adicionadas regras de negócio fora desta especificação sem
    aprovação.

------------------------------------------------------------------------

## 60. Regra para o Codex

Ao implementar:

-   consultar este documento antes de decidir comportamento;
-   não ampliar escopo por iniciativa própria;
-   não simplificar removendo regra de integridade;
-   não criar status adicionais sem aprovação;
-   não criar permissões novas sem aprovação;
-   não transformar exceções em novos workflows sem aprovação;
-   não substituir histórico imutável por edição;
-   não confiar exclusivamente na UI para segurança;
-   não trabalhar diretamente em Produção como ambiente de
    desenvolvimento;
-   quando existir ambiguidade real, parar e apresentar a decisão
    necessária antes de implementar comportamento arbitrário.

------------------------------------------------------------------------

## 61. Estado da especificação

Os requisitos funcionais da V1 estão considerados **fechados para início
da implementação**.

Mudanças posteriores devem ser classificadas como:

-   correção da especificação;
-   bug;
-   melhoria de UX sem alteração de regra;
-   nova funcionalidade/escopo.

Novas funcionalidades não devem ser incorporadas silenciosamente durante
a implementação.

**Este documento é a fonte de verdade do Estoque TI V1.**
