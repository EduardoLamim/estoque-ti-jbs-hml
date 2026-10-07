import { useEffect, useRef, useState, type FormEvent } from 'react';
import { ArrowRight, Box, ScanLine, ShieldCheck } from 'lucide-react';
import { useAuth } from './AuthProvider';
import { BadgeScanner } from './session';
import { configured, userError } from '../../services/backend';
import { Notice } from '../../components/Feedback';
export function Login() {
  const { login } = useAuth();
  const [identity, setIdentity] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const lock = useRef(false);
  useEffect(() => {
    const scanner = new BadgeScanner();
    const scan = (event: KeyboardEvent) => {
      const token = scanner.push(event.key, performance.now());
      if (token) {
        event.preventDefault();
        if (!lock.current && configured) {
          lock.current = true;
          setBusy(true);
          void login({ action: 'badge', token })
            .catch((e) => setError(userError(e).message))
            .finally(() => {
              lock.current = false;
              setBusy(false);
            });
        }
      }
    };
    window.addEventListener('keydown', scan, true);
    return () => window.removeEventListener('keydown', scan, true);
  }, [login]);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (lock.current) return;
    lock.current = true;
    setBusy(true);
    setError('');
    const data = new FormData(event.currentTarget);
    try {
      await login(
        identity
          ? { action: 'exceptional', identity, pin: data.get('pin') }
          : { action: 'password', username: data.get('username'), password: data.get('password') },
      );
    } catch (e) {
      setError(userError(e).message);
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }
  return (
    <main className="login-page">
      <section className="login-story">
        <div className="brand">
          <Box size={30} />
          <span>
            TI HUB <small>OPERAÇÕES & INFRAESTRUTURA</small>
          </span>
        </div>
        <div>
          <span className="eyebrow">GESTÃO COM CONTROLE</span>
          <h1>
            Uma base sólida.
            <br />
            Um estoque
            <br />
            <em>organizado.</em>
          </h1>
          <p>
            Gestão de ativos e materiais de TI.
            <br />
            Informação confiável, acesso seguro e rastreabilidade.
          </p>
        </div>
        <div className="story-footer">
          <ShieldCheck size={18} /> Acesso corporativo · Ambiente de homologação
        </div>
      </section>
      <section className="login-panel">
        <div className="login-card">
          <span className="tag">HML</span>
          <h2>Estoque TI</h2>
          <p className="muted">Entre para acessar seu ambiente de trabalho.</p>
          {!configured && (
            <Notice>
              Configure a conexão com o Supabase HML para habilitar o acesso. Consulte o README do
              projeto.
            </Notice>
          )}
          {error && <Notice error>{error}</Notice>}
          <form onSubmit={submit}>
            {identity ? (
              <>
                <button type="button" className="text-button" onClick={() => setIdentity('')}>
                  ← Voltar ao acesso por usuário
                </button>
                <h3>{identity === 'MONITORING' ? 'Monitoramento' : 'Terceiro'}</h3>
                <label>
                  PIN de acesso *
                  <input
                    name="pin"
                    type="password"
                    inputMode="numeric"
                    autoComplete="off"
                    required
                    maxLength={32}
                  />
                </label>
              </>
            ) : (
              <>
                <label>
                  Usuário *
                  <input
                    name="username"
                    autoComplete="username"
                    required
                    maxLength={64}
                    placeholder="Seu usuário"
                  />
                </label>
                <label>
                  Senha *
                  <input
                    name="password"
                    type="password"
                    autoComplete="current-password"
                    required
                    maxLength={128}
                    placeholder="Sua senha"
                  />
                </label>
              </>
            )}
            <button className="primary" disabled={busy || !configured}>
              {busy ? 'Entrando…' : 'Entrar'}
              <ArrowRight size={18} />
            </button>
          </form>
          <div className="badge-hint">
            <ScanLine size={24} />
            <div>
              <strong>Bipe seu crachá para entrar.</strong>
              <small>A leitura é automática nesta tela.</small>
            </div>
          </div>
          <div className="exceptional-login">
            <span>Acesso excepcional</span>
            <div>
              <button
                disabled={busy}
                onClick={() => {
                  setIdentity('MONITORING');
                  setError('');
                }}
              >
                Monitoramento
              </button>
              <button
                disabled={busy}
                onClick={() => {
                  setIdentity('THIRD_PARTY');
                  setError('');
                }}
              >
                Terceiro
              </button>
            </div>
          </div>
          <p className="login-foot">Estoque TI · Gestão de ativos e materiais de TI</p>
        </div>
      </section>
    </main>
  );
}
