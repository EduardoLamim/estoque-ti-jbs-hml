import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react';
import QRCode from 'qrcode';
import {
  validNewPassword,
  PASSWORD_MIN_LENGTH,
  PASSWORD_MAX_LENGTH,
  PASSWORD_POLICY_MESSAGE,
} from '../../../supabase/functions/_shared/password-policy';
import { Plus, QrCode, Search, X } from 'lucide-react';
import { api, userError } from '../../services/backend';
import { roleLabels, type FormValues, type Profile, type Role } from '../../domain/model';
import { Loading, Empty, Notice } from '../../components/Feedback';
import { useUnsaved } from '../../hooks/useUnsaved';
const initial: FormValues = { display_name: '', username: '', role: 'IT', active: true };
export function UsersPage() {
  const [rows, setRows] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [editing, setEditing] = useState(false);
  const [record, setRecord] = useState<Profile | null>(null);
  const [values, setValues] = useState(initial);
  const [password, setPassword] = useState('');
  const [baseline, setBaseline] = useState('');
  const [busy, setBusy] = useState(false);
  const [qr, setQr] = useState('');
  const [uncertain, setUncertain] = useState(false);
  const operation = useRef(crypto.randomUUID());
  const lock = useRef(false);
  const dirty = editing && (JSON.stringify(values) !== baseline || Boolean(password));
  useUnsaved(dirty);
  const reload = useCallback(async () => {
    setLoading(true);
    try {
      setRows(await api.users());
    } catch (e) {
      setError(userError(e).message);
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => {
    void reload();
  }, [reload]);
  function edit(user: Profile | null) {
    if (busy || uncertain) return;
    if (dirty && !confirm('Existem alterações não salvas. Deseja sair?')) return;
    const data = user
      ? {
          display_name: user.display_name,
          username: user.username,
          role: user.role,
          active: user.active,
        }
      : initial;
    setValues(data);
    setBaseline(JSON.stringify(data));
    setPassword('');
    setRecord(user);
    setEditing(true);
    setError('');
    setMessage('');
    operation.current = crypto.randomUUID();
  }
  async function save(event: FormEvent) {
    event.preventDefault();
    if (lock.current) return;
    if (!record && !validNewPassword(password)) {
      setError(PASSWORD_POLICY_MESSAGE);
      return;
    }
    if (
      record?.active &&
      !values.active &&
      !confirm('Desativar este usuário? O acesso será bloqueado.')
    )
      return;
    lock.current = true;
    setBusy(true);
    setError('');
    try {
      await api.saveUser(record, values, password, operation.current);
      setPassword('');
      setEditing(false);
      setMessage('Usuário salvo com sucesso.');
      await reload();
    } catch (e) {
      const problem = userError(e);
      setError(problem.message);
      if (['UNEXPECTED', 'UNCERTAIN'].includes(problem.code)) setUncertain(true);
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }
  async function badge(user: Profile) {
    if (
      lock.current ||
      !confirm(
        `Gerar novo QR para ${user.display_name}? O anterior deixará de funcionar imediatamente.`,
      )
    )
      return;
    lock.current = true;
    setBusy(true);
    setQr('');
    setError('');
    try {
      const result = await api.badge(user.id, crypto.randomUUID());
      setQr(
        await QRCode.toDataURL(result.token, { width: 360, margin: 4, errorCorrectionLevel: 'M' }),
      );
    } catch (e) {
      setError(userError(e).message);
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }
  async function reset() {
    if (!record || lock.current) return;
    if (!validNewPassword(password)) {
      setError(PASSWORD_POLICY_MESSAGE);
      return;
    }
    if (!confirm('Redefinir a senha e encerrar as sessões deste usuário?')) return;
    lock.current = true;
    setBusy(true);
    try {
      await api.resetPassword(record.id, password);
      setPassword('');
      setMessage('Senha redefinida.');
    } catch (e) {
      setError(userError(e).message);
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }
  async function verify() {
    setBusy(true);
    try {
      if (await api.operation(operation.current)) {
        setEditing(false);
        setPassword('');
        await reload();
        setMessage('Operação confirmada.');
      } else setError('Operação ainda não registrada. Reenvie com o mesmo identificador.');
      setUncertain(false);
    } catch (e) {
      setError(userError(e).message);
    } finally {
      setBusy(false);
    }
  }
  const filtered = rows.filter((p) =>
    `${p.display_name} ${p.username}`.toLowerCase().includes(query.toLowerCase()),
  );
  return (
    <>
      <div className="page-heading">
        <div>
          <span className="eyebrow">ADMINISTRAÇÃO / ACESSO</span>
          <h1>Usuários</h1>
          <p>Identidades individuais, perfis de acesso e credenciais de crachá.</p>
        </div>
        <button className="primary" onClick={() => edit(null)}>
          <Plus size={18} />
          Novo usuário
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
                aria-label="Buscar usuários"
                placeholder="Buscar por nome ou usuário"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </div>
          </div>
          {loading ? (
            <Loading />
          ) : !filtered.length ? (
            <Empty title="Nenhum usuário encontrado.">Revise a busca ou cadastre um usuário.</Empty>
          ) : (
            <div className="table-scroll">
              <table>
                <thead>
                  <tr>
                    <th>Nome / usuário</th>
                    <th>Perfil</th>
                    <th>Status</th>
                    <th>Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((p) => (
                    <tr key={p.id}>
                      <td>
                        <strong>{p.display_name}</strong>
                        <small>{p.username}</small>
                      </td>
                      <td>{roleLabels[p.role]}</td>
                      <td>
                        <span className={`status ${p.active ? 'active' : ''}`}>
                          {p.active ? 'Ativo' : 'Inativo'}
                        </span>
                      </td>
                      <td>
                        <div className="row-actions">
                          <button onClick={() => edit(p)}>Editar</button>
                          <button
                            disabled={!p.active || busy}
                            onClick={() => void badge(p)}
                            title="Gerar novo QR"
                          >
                            <QrCode size={16} />
                            QR
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
        {editing && (
          <aside className="panel editor">
            <header>
              <h2>{record ? 'Editar usuário' : 'Novo usuário'}</h2>
              <button
                className="icon-button"
                aria-label="Fechar edição"
                onClick={() => {
                  if (
                    !busy &&
                    !uncertain &&
                    (!dirty || confirm('Existem alterações não salvas. Deseja sair?'))
                  )
                    setEditing(false);
                }}
              >
                <X size={18} />
              </button>
            </header>
            <form onSubmit={save}>
              <fieldset disabled={busy || uncertain}>
                <label>
                  Nome *
                  <input
                    required
                    maxLength={120}
                    value={String(values.display_name)}
                    onChange={(e) => setValues({ ...values, display_name: e.target.value })}
                  />
                </label>
                <label>
                  Username *
                  <input
                    required
                    pattern="[a-zA-Z0-9._\-]{3,64}"
                    title="De 3 a 64 caracteres: letras, números, ponto, hífen ou sublinhado."
                    value={String(values.username)}
                    onChange={(e) => setValues({ ...values, username: e.target.value })}
                  />
                </label>
                <label>
                  Perfil *
                  <select
                    value={String(values.role)}
                    onChange={(e) => setValues({ ...values, role: e.target.value })}
                  >
                    {(['ADMIN', 'STOCK_CONTROLLER', 'IT'] as Role[]).map((role) => (
                      <option key={role} value={role}>
                        {roleLabels[role]}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="check-field">
                  <input
                    type="checkbox"
                    checked={Boolean(values.active)}
                    onChange={(e) => setValues({ ...values, active: e.target.checked })}
                  />
                  Usuário ativo
                </label>
                {!record && (
                  <label>
                    Senha inicial *
                    <input
                      required
                      minLength={PASSWORD_MIN_LENGTH}
                      maxLength={PASSWORD_MAX_LENGTH}
                      type="password"
                      autoComplete="new-password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                    />
                    <small>{PASSWORD_POLICY_MESSAGE}</small>
                  </label>
                )}
                <button className="primary" disabled={busy}>
                  {busy ? 'Salvando…' : 'Salvar usuário'}
                </button>
                {record && (
                  <div className="password-reset">
                    <h3>Redefinir senha</h3>
                    <label>
                      Nova senha
                      <input
                        type="password"
                        autoComplete="new-password"
                        maxLength={PASSWORD_MAX_LENGTH}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                      />
                      <small>{PASSWORD_POLICY_MESSAGE}</small>
                    </label>
                    <button type="button" onClick={() => void reset()}>
                      Redefinir senha
                    </button>
                  </div>
                )}
              </fieldset>
              {uncertain && (
                <button type="button" disabled={busy} onClick={() => void verify()}>
                  Verificar operação
                </button>
              )}
            </form>
          </aside>
        )}
      </div>
      {qr && (
        <div className="modal-backdrop">
          <section
            className="qr-dialog"
            role="dialog"
            aria-modal="true"
            aria-label="Novo QR de crachá"
          >
            <h2>QR de acesso gerado</h2>
            <p>O QR anterior foi invalidado. Imprima agora; este QR não será exibido novamente.</p>
            <img className="badge-print" src={qr} alt="QR de autenticação do crachá" />
            <div className="form-actions">
              <button onClick={() => setQr('')}>Fechar</button>
              <button className="primary" onClick={() => window.print()}>
                Imprimir QR
              </button>
            </div>
          </section>
        </div>
      )}
    </>
  );
}
