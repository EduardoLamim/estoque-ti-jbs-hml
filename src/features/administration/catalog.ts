import type { Entity, FormValues } from '../../domain/model';
export interface Field {
  key: string;
  label: string;
  kind?: 'position' | 'checkbox' | 'textarea';
  required?: boolean;
  max?: number;
}
const name: Field = { key: 'name', label: 'Nome', required: true, max: 120 };
const notes: Field = { key: 'notes', label: 'Observação', kind: 'textarea', max: 4000 };
const active: Field = { key: 'active', label: 'Cadastro ativo', kind: 'checkbox' };
export const catalog: Record<
  Entity,
  { title: string; singular: string; description: string; fields: Field[]; initial: FormValues }
> = {
  categories: {
    title: 'Categorias',
    singular: 'categoria',
    description: 'Defina a classificação e as regras de preparação dos itens.',
    fields: [
      name,
      { key: 'preferred_position_id', label: 'Posição preferencial', kind: 'position' },
      { key: 'triage_on_create', label: 'Exigir triagem no cadastro', kind: 'checkbox' },
      { key: 'triage_on_return', label: 'Exigir triagem no retorno de uso', kind: 'checkbox' },
      { key: 'triage_position_id', label: 'Posição de triagem', kind: 'position' },
      { key: 'require_hostname', label: 'Exigir hostname ao colocar em uso', kind: 'checkbox' },
      notes,
      active,
    ],
    initial: {
      name: '',
      preferred_position_id: null,
      triage_position_id: null,
      triage_on_create: false,
      triage_on_return: false,
      require_hostname: false,
      notes: '',
      active: true,
    },
  },
  manufacturers: {
    title: 'Fabricantes',
    singular: 'fabricante',
    description: 'Organize as marcas utilizadas nos cadastros do estoque.',
    fields: [name, active],
    initial: { name: '', active: true },
  },
  suppliers: {
    title: 'Fornecedores',
    singular: 'fornecedor',
    description: 'Mantenha os dados das empresas que prestam manutenção.',
    fields: [
      name,
      { key: 'cnpj', label: 'CNPJ', required: true, max: 18 },
      { key: 'address', label: 'Endereço', required: true, max: 500 },
      notes,
      active,
    ],
    initial: { name: '', cnpj: '', address: '', notes: '', active: true },
  },
  locations: {
    title: 'Localizações',
    singular: 'localização',
    description: 'Cadastre os locais operacionais de uso e destino no terminal.',
    fields: [name, notes, active],
    initial: { name: '', notes: '', active: true },
  },
  stock_positions: {
    title: 'Posições de estoque',
    singular: 'posição',
    description: 'Organize a estrutura física do estoque, sem limites de níveis.',
    fields: [name, { key: 'parent_id', label: 'Posição pai', kind: 'position' }, active],
    initial: { name: '', parent_id: null, active: true },
  },
};
