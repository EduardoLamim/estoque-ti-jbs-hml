# Aceite operacional — Phase 01

Não marcar a fase como concluída apenas por testes locais. Backend HML já implantado e homologação parcial confirmada pelo responsável em 07/10/2026. Não reaplicar bootstrap nem redefinir senhas para esta revisão. Nova política de senha e workflow ainda precisam publicação/validação externa.

## Evidências já recebidas

Homologados pelo responsável: login Admin, cadastros-base, categorias, fabricantes, fornecedores/CNPJ, localizações, POS hierárquicas, usuários/perfis, geração/regeneração de QR, acessos excepcionais, desativação com revogação imediata, proteção do último Admin e gravação de eventos de auditoria. O relatório `PHASE_01_REVIEW.md` distingue essas aprovações dos testes negativos específicos abaixo. Uma caixa ainda aberta que reúne vários cenários não invalida os fluxos já confirmados.

- [x] Timeout de 10 minutos aprovado definitivamente no HML: encerrou automaticamente antes de nova interação. AC-AUTH-004 e DoD 10 aprovados.
- [x] Health-check nativo HML testado em 07/10: HTTP 200 com contrato GoTrue válido, somente leitura.

## Nova política de senha e publicação

- [ ] Publicar Edge `foundation` atualizada; acesso CLI desta execução retornou 403 por falta de `edge_functions_read`.
- [ ] Publicar frontend e registrar commit/URL; não executar migration/reset/bootstrap para esta revisão.
- [ ] Criação e reset rejeitam menos de 8 caracteres, ausência de letra, número ou especial, inclusive por chamada direta à Edge.
- [ ] Criação e reset aceitam senha válida de exatamente 8 caracteres, inclusive somente letras minúsculas ou somente maiúsculas.
- [ ] Login existente continua funcionando sem redefinição automática; edição de perfil não altera senha.
- [ ] Conferir política nativa Auth e alteração direta pelo provedor: não presumir que a Edge intercepta endpoints Auth. Consultar responsável se a regra exata exigir mudança arquitetural.
- [ ] Confirmar ausência de senhas em logs/auditoria após testes reais.
- [ ] Publicar workflow na branch padrão, configurar variável pública `VITE_SUPABASE_PUBLISHABLE_KEY` e executar `HML read-only health` manualmente. Nenhuma service role.

## Preparação

- [ ] Confirmar project ref `xghrambcwigdemxancxr`; não usar PRD.
- [ ] Registrar URL do Pages e commit implantado.
- [ ] Migrations aplicadas por CLI; nenhuma mudança manual de schema.
- [ ] Autoinscrição desabilitada e e-mail/senha habilitado em Auth.
- [ ] Origins da Edge incluem Pages e localhost apenas quando necessários.
- [ ] Executar `pnpm test:hml` com senhas em arquivo local ignorado.

## Autenticação e sessão

- [ ] Entrar como `admin.hml`, `controlador.hml`, `ti.hml`, informando somente username/senha.
- [ ] Senha incorreta e usuário inexistente retornam a mesma mensagem genérica.
- [ ] Desativar usuário de teste: login bloqueado e sessão antiga sem acesso por API; reativação não recupera sessão antiga.
- [ ] Sair e confirmar que JWT anterior não lê dados (`my_profile` retorna null).
- [x] Aguardar 10 minutos sem interação: voltar automaticamente ao login, antes de interagir novamente (evidência definitiva do responsável).
- [ ] Confirmar separadamente descarte de formulário e que refresh/reabertura não estendem sessão; não repetir a aprovação do timeout básico.
- [ ] Mouse, teclado, navegação e scanner mantêm sessão durante uso normal.
- [ ] Admin gera QR com confirmação; imprimir somente QR (25 mm), testar leitura física com o leitor utilizado na operação.
- [ ] QR entra sem clique prévio; QR inválido não autentica.
- [ ] Gerar outro QR: o anterior falha imediatamente; o novo funciona.
- [ ] Ler outro crachá com sessão aberta não troca usuário.

## Acesso excepcional

- [ ] Monitoramento e Terceiro pedem PIN e identificam a sessão separadamente.
- [ ] PIN inicial especificado pelo MASTER funciona após bootstrap e não é mostrado na UI.
- [ ] PIN incorreto não emite sessão. Cinco tentativas em cinco minutos esgotam o limite; a seguinte recebe 429.
- [ ] Login normal continua funcionando enquanto o PIN está bloqueado.
- [ ] Após a janela, o acesso excepcional volta a aceitar tentativas.
- [ ] Admin troca PIN; campo atual nunca é exibido; PIN antigo falha e novo funciona.
- [ ] Auditoria registra a mudança sem valores, hash, senha ou token.
- [ ] Desabilitar cada identidade bloqueia login e sessão existente; reabilitar exige novo login.

## Permissões e usuários

- [ ] Admin cria/edita/ativa/desativa usuário e redefine senha quando necessário.
- [ ] Controlador administra cadastros, mas não abre nem modifica usuários/PIN por API direta.
- [ ] TI não abre Administração nem grava cadastros por RPC/DML direto.
- [ ] Monitoramento/Terceiro não leem cadastros nem auditoria administrativos.
- [x] Proteção do último Admin homologada pelo responsável.
- [ ] UPDATE/DELETE de auditoria e DML direto em cadastros são recusados inclusive para Admin.
- [ ] Hash de QR e auditoria de reset não podem ser gravados por RPC direta de Admin: somente servidor.

## Cadastros e posições

- [ ] Criar/editar fabricante; duplicidade de nome com variação de maiúsculas/espaços externos é recusada.
- [ ] Criar/editar fornecedor; CNPJ inválido ou duplicado é recusado.
- [ ] Criar/editar localização; desativação confirma a ação e mantém histórico.
- [ ] Categoria sem POS preferencial salva e mostra “Não definida”, sem alerta.
- [ ] Cada regra de triagem exige POS de triagem; POS inativa não é selecionável.
- [ ] Alterações de categoria registram old/new; salvar sem mudança não gera evento.
- [ ] Criar raiz, filha e neta; buscar por código, nome e caminho; editar nome.
- [ ] Código POS é único e imutável; árvore rejeita ciclo/pai inexistente.
- [ ] Desativação de POS referenciada por categoria ou com filha ativa é bloqueada.
- [ ] Dois operadores editam mesmo cadastro: o segundo save obsoleto falha sem sobrescrever o primeiro.
- [ ] Reenvio com o mesmo UUID não duplica cadastro nem evento.
- [ ] Interromper rede durante save: consultar resultado antes de reenviar; não concluir falha por suposição.

## Interface e publicação

- [ ] Desktop, tablet e celular: menus, tabelas e formulários permanecem utilizáveis.
- [ ] Estados loading, vazio, erro, sucesso, inativo e disabled estão claros.
- [ ] Sair de formulário alterado pede confirmação; timeout descarta sem confirmação.
- [ ] Refresh de `/#/admin/categories` no Pages funciona.
- [ ] Módulos futuros exibem somente indisponibilidade, sem dados/indicadores falsos.
- [ ] Inspecionar bundle e variáveis do workflow: nenhuma credencial privilegiada.
- [ ] Revisar logs técnicos e auditoria: nenhum PIN, token QR, senha ou resposta Auth completa.

Registrar evidências e atualizar `PHASE_01_REVIEW.md`. Só então considerar o Definition of Done atingido. Não iniciar Phase 02.
