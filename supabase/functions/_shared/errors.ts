import { PASSWORD_POLICY_MESSAGE } from './password-policy.ts';
export const messages: Record<string, string> = {
  PASSWORD_POLICY: PASSWORD_POLICY_MESSAGE,
  AUTH_FAILED: 'Não foi possível entrar. Confira os dados de acesso e tente novamente.',
  RATE_LIMITED: 'Acesso temporariamente bloqueado. Aguarde alguns minutos e tente novamente.',
  FORBIDDEN: 'Seu perfil não permite esta ação.',
  SESSION_EXPIRED: 'Sua sessão expirou. Entre novamente.',
  LAST_ADMIN: 'É necessário manter pelo menos um Administrador ativo.',
  POSITION_REFERENCED:
    'Esta posição está vinculada a uma categoria ou possui posições filhas ativas.',
  POSITION_INACTIVE: 'Posição inativa. Selecione outra posição.',
  INVALID_PARENT: 'Selecione uma posição pai válida e ativa.',
  POSITION_CYCLE: 'Uma posição não pode ser descendente dela mesma.',
  TRIAGE_REQUIRED: 'Informe uma posição de triagem.',
  STALE_VERSION: 'Este registro foi alterado. Atualize a lista antes de salvar novamente.',
  NOT_FOUND: 'Registro não encontrado ou indisponível.',
  INVALID_INPUT: 'Confira os campos informados.',
  DUPLICATE: 'Já existe um cadastro com esse identificador.',
  ALREADY_EXECUTED: 'Esta operação já foi executada. Atualize os dados.',
  UNCERTAIN:
    'Não foi possível confirmar o resultado. Verifique a operação antes de tentar novamente.',
  CONFIGURATION: 'O ambiente HML ainda precisa ser configurado.',
};
export function businessCode(error: unknown): string | undefined {
  if (!error || typeof error !== 'object') return undefined;
  const value = error as { message?: string; code?: string };
  if (value.message && messages[value.message]) return value.message;
  if (value.code === '23505') return 'DUPLICATE';
  if (['23514', '23502', '22P02', '22001', '23503'].includes(value.code || ''))
    return 'INVALID_INPUT';
  return undefined;
}
