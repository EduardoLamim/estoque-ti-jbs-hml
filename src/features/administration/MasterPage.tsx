import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react';
import { ChevronRight, FolderTree, Plus, Search, X } from 'lucide-react';
import { api, AppError, userError } from '../../services/backend';
import {
  positionPath,
  validateMaster,
  type Entity,
  type FormValues,
  type MasterRecord,
} from '../../domain/model';
import { catalog } from './catalog';
import { Empty, Loading, Notice } from '../../components/Feedback';
import { Fields } from '../../components/Fields';
import { useUnsaved } from '../../hooks/useUnsaved';
function PositionTree({
  items,
  parent = null,
  onSelect,
}: {
  items: MasterRecord[];
  parent?: string | null;
  onSelect: (p: MasterRecord) => void;
}) {
  return (
    <ul className="position-tree">
      {items
        .filter((p) => (p.parent_id || null) === parent)
        .map((p) => (
          <li key={p.id}>
            <button onClick={() => onSelect(p)}>
              <FolderTree size={16} />
              <span>
                {p.name}
                <small>
                  {p.code}
                  {!p.active ? ' · Inativa' : ''}
                </small>
              </span>
            </button>
            <PositionTree items={items} parent={p.id} onSelect={onSelect} />
          </li>
        ))}
    </ul>
  );
}
export function MasterPage({ entity }: { entity: Entity }) {
  const config = catalog[entity];
  const [rows, setRows] = useState<MasterRecord[]>([]);
  const [positions, setPositions] = useState<MasterRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState('all');
  const [editing, setEditing] = useState(false);
  const [record, setRecord] = useState<MasterRecord | null>(null);
  const [values, setValues] = useState<FormValues>(config.initial);
  const [baseline, setBaseline] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [uncertain, setUncertain] = useState(false);
  const lock = useRef(false);
  const operation = useRef(crypto.randomUUID());
  const dirty = editing && JSON.stringify(values) !== baseline;
  useUnsaved(dirty);
  const reload = useCallback(async () => {
    setLoading(true);
    try {
      const [data, pos] = await Promise.all([api.list(entity), api.list('stock_positions')]);
      setRows(data);
      setPositions(pos);
    } catch (e) {
      setError(userError(e).message);
    } finally {
      setLoading(false);
    }
  }, [entity]);
  useEffect(() => {
    void reload();
  }, [reload]);
  function close() {
    if (busy || uncertain) return;
    if (dirty && !window.confirm('Existem alterações não salvas. Deseja sair?')) return;
    setEditing(false);
  }
  function edit(item: MasterRecord | null, parent?: string) {
    if (busy || uncertain) return;
    if (dirty && !window.confirm('Existem alterações não salvas. Deseja sair?')) return;
    const data = { ...config.initial };
    if (item)
      for (const key of Object.keys(data))
        data[key] = (item as unknown as FormValues)[key] ?? data[key];
    if (parent) data.parent_id = parent;
    setRecord(item);
    setValues(data);
    setBaseline(JSON.stringify(data));
    setErrors({});
    setError('');
    setMessage('');
    setEditing(true);
    operation.current = crypto.randomUUID();
  }
  async function save(event: FormEvent) {
    event.preventDefault();
    if (lock.current) return;
    const invalid = validateMaster(entity, values);
    setErrors(invalid);
    if (Object.keys(invalid).length) return;
    if (
      record?.active &&
      !values.active &&
      !window.confirm('Desativar este cadastro? Ele permanecerá no histórico.')
    )
      return;
    lock.current = true;
    setBusy(true);
    setError('');
    try {
      await api.save(entity, record, values, operation.current);
      setEditing(false);
      setUncertain(false);
      setMessage('Cadastro salvo com sucesso.');
      await reload();
    } catch (e) {
      const problem = userError(e);
      setError(problem.message);
      if (problem.code === 'UNEXPECTED' || problem.code === 'UNCERTAIN') setUncertain(true);
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }
  async function verify() {
    setBusy(true);
    try {
      const result = await api.operation(operation.current);
      if (result) {
        setEditing(false);
        setUncertain(false);
        setMessage('Operação confirmada. Cadastro salvo.');
        await reload();
      } else {
        setUncertain(false);
        setError('Operação ainda não registrada. Você pode reenviar com o mesmo identificador.');
      }
    } catch {
      setError(new AppError('UNCERTAIN').message);
    } finally {
      setBusy(false);
    }
  }
  const filtered = rows.filter(
    (p) =>
      (status === 'all' || p.active === (status === 'active')) &&
      `${p.name} ${p.code || ''} ${p.cnpj || ''} ${entity === 'stock_positions' ? positionPath(p.id, positions) : ''}`
        .toLocaleLowerCase('pt-BR')
        .includes(query.toLocaleLowerCase('pt-BR')),
  );
  return (
    <>
      <div className="page-heading">
        <div>
          <span className="eyebrow">
            ADMINISTRAÇÃO / {entity === 'stock_positions' ? 'ESTOQUE' : 'CADASTROS'}
          </span>
          <h1>{config.title}</h1>
          <p>{config.description}</p>
        </div>
        <button className="primary" onClick={() => edit(null)}>
          <Plus size={18} />
          Novo cadastro
        </button>
      </div>
      {error && <Notice error>{error}</Notice>}
      {message && <Notice>{message}</Notice>}
      <div className={`workspace ${editing ? 'with-editor' : ''}`}>
        <section className="panel">
          <div className="table-toolbar">
            <div className="search-input">
              <Search size={18} />
              <input
                aria-label="Buscar cadastros"
                placeholder={
                  entity === 'stock_positions'
                    ? 'Buscar por nome, código ou caminho'
                    : 'Buscar cadastro'
                }
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </div>
            <select
              aria-label="Filtrar status"
              value={status}
              onChange={(e) => setStatus(e.target.value)}
            >
              <option value="all">Todos os status</option>
              <option value="active">Ativos</option>
              <option value="inactive">Inativos</option>
            </select>
          </div>
          {loading ? (
            <Loading />
          ) : !filtered.length ? (
            <Empty title={`Nenhum cadastro ${query ? 'encontrado' : 'disponível'}.`}>
              {query
                ? 'Tente outra busca ou altere o filtro.'
                : `Cadastre a primeira ${config.singular === 'fabricante' || config.singular === 'fornecedor' ? 'referência' : config.singular} para começar a organizar o estoque.`}
            </Empty>
          ) : (
            <>
              {entity === 'stock_positions' && !query && status === 'all' ? (
                <PositionTree items={rows} onSelect={(p) => edit(p)} />
              ) : (
                <div className="table-scroll">
                  <table>
                    <thead>
                      <tr>
                        <th>{entity === 'stock_positions' ? 'Posição / caminho' : 'Nome'}</th>
                        <th>
                          {entity === 'categories'
                            ? 'Posição preferencial'
                            : entity === 'suppliers'
                              ? 'CNPJ'
                              : 'Identificação'}
                        </th>
                        <th>Status</th>
                        <th>
                          <span className="sr-only">Ações</span>
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {filtered.map((row) => (
                        <tr key={row.id}>
                          <td>
                            <strong>{row.name}</strong>
                            {entity === 'stock_positions' && (
                              <small>{positionPath(row.id, positions)}</small>
                            )}
                          </td>
                          <td>
                            {entity === 'categories'
                              ? row.preferred_position_id
                                ? positionPath(row.preferred_position_id, positions)
                                : 'Não definida'
                              : row.cnpj || row.code || '—'}
                          </td>
                          <td>
                            <span className={`status ${row.active ? 'active' : ''}`}>
                              {row.active ? 'Ativo' : 'Inativo'}
                            </span>
                          </td>
                          <td>
                            <button
                              className="icon-button"
                              aria-label={`Editar ${row.name}`}
                              onClick={() => edit(row)}
                            >
                              <ChevronRight size={18} />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          )}
          <footer className="table-footer">
            {filtered.length} {filtered.length === 1 ? 'cadastro' : 'cadastros'}
            {entity === 'stock_positions' ? ' · Estrutura hierárquica dinâmica' : ''}
          </footer>
        </section>
        {editing && (
          <aside className="panel editor">
            <header>
              <div>
                <span className="eyebrow">{record ? 'EDITAR' : 'NOVO CADASTRO'}</span>
                <h2>{record?.name || config.title}</h2>
                {record?.code && <small>{record.code} · Código imutável</small>}
              </div>
              <button className="icon-button" aria-label="Fechar edição" onClick={close}>
                <X size={18} />
              </button>
            </header>
            <form onSubmit={save} noValidate>
              <fieldset disabled={busy || uncertain}>
                <Fields
                  fields={config.fields}
                  values={values}
                  setValues={setValues}
                  errors={errors}
                  positions={positions}
                  excluded={record?.id}
                />
                {entity === 'stock_positions' && record && (
                  <button type="button" onClick={() => edit(null, record.id)}>
                    <Plus size={16} />
                    Criar posição filha
                  </button>
                )}
                <div className="form-actions">
                  <button type="button" onClick={close}>
                    Cancelar
                  </button>
                  <button className="primary" disabled={busy}>
                    {busy ? 'Salvando…' : 'Salvar cadastro'}
                  </button>
                </div>
              </fieldset>
              {uncertain && (
                <button
                  type="button"
                  className="primary"
                  disabled={busy}
                  onClick={() => void verify()}
                >
                  Verificar operação
                </button>
              )}
            </form>
          </aside>
        )}
      </div>
    </>
  );
}
