import { useEffect, useRef, useState, type FormEvent } from 'react';
import { ShieldCheck } from 'lucide-react';
import { api, userError } from '../../services/backend';
import type { ExceptionalSettings } from '../../domain/model';
import { Loading, Notice } from '../../components/Feedback';
import { useUnsaved } from '../../hooks/useUnsaved';
export function ExceptionalPage() {
  const [settings, setSettings] = useState<ExceptionalSettings | null>(null);
  const [baseline, setBaseline] = useState('');
  const [pin, setPin] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [uncertain, setUncertain] = useState(false);
  const lock = useRef(false);
  const operation = useRef(crypto.randomUUID());
  useUnsaved(
    Boolean(settings) &&
      (JSON.stringify(settings) !== baseline || Boolean(pin) || Boolean(confirmation)),
  );
  useEffect(() => {
    void api
      .settings()
      .then((s) => {
        setSettings(s);
        setBaseline(JSON.stringify(s));
      })
      .catch((e) => setError(userError(e).message));
  }, []);
  async function submit(event: FormEvent) {
    event.preventDefault();
    if (lock.current || !settings) return;
    if (pin !== confirmation) {
      setError('Os PINs informados não coincidem.');
      return;
    }
    lock.current = true;
    setBusy(true);
    setError('');
    try {
      await api.saveSettings(settings, pin, operation.current);
      const updated = await api.settings();
      setSettings(updated);
      setBaseline(JSON.stringify(updated));
      setPin('');
      setConfirmation('');
      setMessage('Acessos excepcionais atualizados.');
      operation.current = crypto.randomUUID();
    } catch (e) {
      const problem = userError(e);
      setError(problem.message);
      if (['UNEXPECTED', 'UNCERTAIN'].includes(problem.code)) setUncertain(true);
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }
  async function verify() {
    if (lock.current) return;
    lock.current = true;
    setBusy(true);
    try {
      const result = await api.operation(operation.current);
      if (result) {
        const updated = await api.settings();
        setSettings(updated);
        setBaseline(JSON.stringify(updated));
        setPin('');
        setConfirmation('');
        operation.current = crypto.randomUUID();
        setMessage('Operação confirmada. Acessos atualizados.');
        setError('');
      } else {
        setError('Operação ainda não registrada. Você pode reenviar com o mesmo identificador.');
      }
      setUncertain(false);
    } catch (e) {
      setError(userError(e).message);
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }
  return (
    <>
      <div className="page-heading">
        <div>
          <span className="eyebrow">ADMINISTRAÇÃO / ACESSO</span>
          <h1>Acessos excepcionais</h1>
          <p>Gerencie o acesso compartilhado de Monitoramento e Terceiro.</p>
        </div>
      </div>
      {error && <Notice error>{error}</Notice>}
      {message && <Notice>{message}</Notice>}
      {!settings ? (
        <Loading />
      ) : (
        <div className="settings-grid">
          <section className="panel settings-form">
            <form onSubmit={submit}>
              <fieldset disabled={busy || uncertain}>
                <h2>Identidades de acesso</h2>
                <label className="check-field">
                  <input
                    type="checkbox"
                    checked={settings.monitoring_enabled}
                    onChange={(e) =>
                      setSettings({ ...settings, monitoring_enabled: e.target.checked })
                    }
                  />
                  Monitoramento habilitado
                </label>
                <label className="check-field">
                  <input
                    type="checkbox"
                    checked={settings.third_party_enabled}
                    onChange={(e) =>
                      setSettings({ ...settings, third_party_enabled: e.target.checked })
                    }
                  />
                  Terceiro habilitado
                </label>
                <hr />
                <h2>Alterar PIN compartilhado</h2>
                <p className="muted">Deixe em branco para manter o PIN atual.</p>
                <label>
                  Novo PIN
                  <input
                    type="password"
                    inputMode="numeric"
                    pattern="[0-9]{4,32}"
                    minLength={4}
                    maxLength={32}
                    autoComplete="new-password"
                    value={pin}
                    onChange={(e) => setPin(e.target.value)}
                  />
                  <small>De 4 a 32 dígitos.</small>
                </label>
                <label>
                  Confirmar novo PIN
                  <input
                    type="password"
                    inputMode="numeric"
                    autoComplete="new-password"
                    required={Boolean(pin)}
                    value={confirmation}
                    onChange={(e) => setConfirmation(e.target.value)}
                  />
                </label>
                <button className="primary">{busy ? 'Salvando…' : 'Salvar alterações'}</button>
              </fieldset>
              {uncertain && (
                <button type="button" disabled={busy} onClick={() => void verify()}>
                  Verificar operação
                </button>
              )}
            </form>
          </section>
          <aside className="info-card">
            <ShieldCheck size={28} />
            <h2>Acesso com rastreabilidade</h2>
            <p>
              As duas identidades utilizam o mesmo PIN e são registradas separadamente na auditoria.
            </p>
            <p>O PIN atual nunca é exibido. A alteração fica registrada sem revelar seu valor.</p>
          </aside>
        </div>
      )}
    </>
  );
}
