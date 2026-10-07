export type Role = 'ADMIN' | 'STOCK_CONTROLLER' | 'IT' | 'MONITORING' | 'THIRD_PARTY';
export const roleLabels: Record<Role, string> = {
  ADMIN: 'Administrador',
  STOCK_CONTROLLER: 'Controlador de Estoque',
  IT: 'TI',
  MONITORING: 'Operador de Monitoramento',
  THIRD_PARTY: 'Terceiro',
};
export const canAdminister = (role: Role) => role === 'ADMIN' || role === 'STOCK_CONTROLLER';
export interface Profile {
  id: string;
  auth_user_id: string;
  username: string;
  display_name: string;
  role: Role;
  active: boolean;
  version: number;
}
export type Entity = 'categories' | 'manufacturers' | 'suppliers' | 'locations' | 'stock_positions';
export interface MasterRecord {
  id: string;
  name: string;
  active: boolean;
  version: number;
  code?: string;
  parent_id?: string | null;
  preferred_position_id?: string | null;
  triage_position_id?: string | null;
  triage_on_create?: boolean;
  triage_on_return?: boolean;
  require_hostname?: boolean;
  notes?: string;
  cnpj?: string;
  address?: string;
}
export interface ExceptionalSettings {
  monitoring_enabled: boolean;
  third_party_enabled: boolean;
  version: number;
}
export type FormValues = Record<string, string | boolean | null>;
export function positionPath(id: string, positions: MasterRecord[]): string {
  const parts: string[] = [];
  const seen = new Set<string>();
  let current = positions.find((p) => p.id === id);
  while (current && !seen.has(current.id)) {
    parts.unshift(current.name);
    seen.add(current.id);
    current = positions.find((p) => p.id === current?.parent_id);
  }
  return parts.join(' › ');
}
export function validCnpj(input: string): boolean {
  const value = input.replace(/[^a-z0-9]/gi, '').toUpperCase();
  if (!/^[A-Z0-9]{12}\d{2}$/.test(value) || /^(.)\1{13}$/.test(value)) return false;
  return [12, 13].every((length) => {
    let sum = 0;
    let weight = length - 7;
    for (let i = 0; i < length; i++) {
      sum += (value.charCodeAt(i) - 48) * weight;
      weight = weight === 2 ? 9 : weight - 1;
    }
    const remainder = sum % 11;
    return Number(value[length]) === (remainder < 2 ? 0 : 11 - remainder);
  });
}
export function validateMaster(entity: Entity, data: FormValues): Record<string, string> {
  const errors: Record<string, string> = {};
  if (!String(data.name || '').trim()) errors.name = 'Informe o nome.';
  if (
    entity === 'categories' &&
    (data.triage_on_create || data.triage_on_return) &&
    !data.triage_position_id
  )
    errors.triage_position_id = 'Selecione uma posição de triagem.';
  if (entity === 'suppliers') {
    if (!validCnpj(String(data.cnpj || ''))) errors.cnpj = 'Informe um CNPJ válido.';
    if (!String(data.address || '').trim()) errors.address = 'Informe o endereço.';
  }
  return errors;
}
