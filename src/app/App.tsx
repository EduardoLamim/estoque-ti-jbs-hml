import {
  createHashRouter,
  Link,
  NavLink,
  Navigate,
  Outlet,
  RouterProvider,
  useLocation,
} from 'react-router-dom';
import {
  Archive,
  ArrowUpRight,
  Box,
  Boxes,
  ClipboardCheck,
  FolderCog,
  Home,
  Layers,
  LogOut,
  Menu,
  Package,
  PlusCircle,
  Repeat2,
  Settings,
  ShieldCheck,
  Users,
  X,
} from 'lucide-react';
import { useState } from 'react';
import { AuthProvider, useAuth } from '../features/auth/AuthProvider';
import { Login } from '../features/auth/Login';
import { MasterPage } from '../features/administration/MasterPage';
import { UsersPage } from '../features/administration/UsersPage';
import { ExceptionalPage } from '../features/administration/ExceptionalPage';
import { canAdminister, roleLabels, type Entity } from '../domain/model';
import { catalog } from '../features/administration/catalog';
import { Empty, Loading } from '../components/Feedback';
const navigation = [
  ['/', 'Início', Home],
  ['/ativos', 'Ativos', Box],
  ['/materiais', 'Materiais', Package],
  ['/cadastrar', 'Cadastrar', PlusCircle],
  ['/reservas', 'Reservas', Archive],
  ['/inventario', 'Inventário', ClipboardCheck],
  ['/movimentacoes', 'Movimentações', Repeat2],
] as const;
export const adminGroups = [
  {
    label: 'Cadastros',
    items: [
      ['categories', 'Categorias'],
      ['manufacturers', 'Fabricantes'],
      ['suppliers', 'Fornecedores'],
      ['locations', 'Localizações'],
    ],
  },
  {
    label: 'Estoque',
    items: [
      ['stock_positions', 'Posições de estoque'],
      ['materiais', 'Materiais'],
      ['ajustes', 'Ajustes de estoque'],
      ['divergencias', 'Divergências'],
    ],
  },
  {
    label: 'Etiquetas',
    items: [
      ['fila', 'Fila de impressão'],
      ['reimpressoes', 'Reimpressões'],
    ],
  },
  { label: 'Notificações', items: [['alertas', 'Alertas']] },
  {
    label: 'Acesso',
    items: [
      ['usuarios', 'Usuários'],
      ['acessos-excepcionais', 'Acessos excepcionais'],
    ],
  },
];
function AuthGate() {
  const { profile, loading } = useAuth();
  if (loading) return <Loading />;
  return profile ? <Outlet /> : <Login />;
}
function AdminGate({ onlyAdmin = false }: { onlyAdmin?: boolean }) {
  const { profile } = useAuth();
  return profile && (onlyAdmin ? profile.role === 'ADMIN' : canAdminister(profile.role)) ? (
    <Outlet />
  ) : (
    <Navigate to="/" replace />
  );
}
function Shell() {
  const { profile, logout } = useAuth();
  const [open, setOpen] = useState(false);
  const location = useLocation();
  if (!profile) return null;
  return (
    <div className="app-shell">
      <aside className={`sidebar ${open ? 'open' : ''}`}>
        <Link to="/" className="brand" onClick={() => setOpen(false)}>
          <Boxes size={28} />
          <span>
            Estoque TI<small>GESTÃO DE TI</small>
          </span>
        </Link>
        <button
          className="mobile-close icon-button"
          aria-label="Fechar menu"
          onClick={() => setOpen(false)}
        >
          <X />
        </button>
        <div className="nav-label">ESPAÇO DE TRABALHO</div>
        <nav>
          {navigation.map(([path, label, Icon]) => (
            <NavLink end={path === '/'} to={path} key={path} onClick={() => setOpen(false)}>
              <Icon size={19} />
              {label}
              {path !== '/' && <span className="nav-dot" />}
            </NavLink>
          ))}
          {canAdminister(profile.role) && (
            <NavLink to="/admin" onClick={() => setOpen(false)}>
              <Settings size={19} />
              Administração
            </NavLink>
          )}
        </nav>
        <div className="sidebar-bottom">
          <ShieldCheck size={18} />
          <div>
            Ambiente de homologação<small>Foundation · Phase 01</small>
          </div>
        </div>
      </aside>
      {open && (
        <button
          className="sidebar-overlay"
          aria-label="Fechar menu"
          onClick={() => setOpen(false)}
        />
      )}
      <div className="main-column">
        <header className="topbar">
          <button
            className="mobile-menu icon-button"
            aria-label="Abrir menu"
            onClick={() => setOpen(true)}
          >
            <Menu />
          </button>
          <div className="topbar-title">
            TI HUB <span>/</span> Estoque TI
          </div>
          <div className="topbar-user">
            <span className="tag">HML</span>
            <div className="avatar">{profile.display_name.slice(0, 2).toUpperCase()}</div>
            <div className="identity">
              <strong>{profile.display_name}</strong>
              <small>{roleLabels[profile.role]}</small>
            </div>
            <button
              className="logout"
              onClick={() => {
                if (window.dispatchEvent(new Event('estoque:before-logout', { cancelable: true })))
                  void logout();
              }}
            >
              <LogOut size={17} />
              <span>Sair</span>
            </button>
          </div>
        </header>
        <main className="content" key={location.pathname}>
          <Outlet />
        </main>
        <footer className="app-footer">
          Estoque TI <span>Gestão de ativos e materiais de TI</span>
        </footer>
      </div>
    </div>
  );
}
function HomePage() {
  const { profile } = useAuth();
  if (!profile) return null;
  return (
    <>
      <div className="page-heading">
        <div>
          <span className="eyebrow">SEU AMBIENTE DE TRABALHO</span>
          <h1>Bem-vindo, {profile.display_name.split(' ')[0]}.</h1>
          <p>Uma base organizada para a gestão do estoque de TI.</p>
        </div>
        <span className="phase-badge">Phase 01 · Fundação</span>
      </div>
      <section className="home-hero">
        <div>
          <span className="eyebrow">ESTOQUE TI</span>
          <h2>
            Organização começa
            <br />
            com uma boa estrutura.
          </h2>
          <p>
            Os módulos operacionais serão habilitados nas próximas fases.{' '}
            {canAdminister(profile.role)
              ? 'Prepare os cadastros e a estrutura física do seu estoque.'
              : 'Seu acesso está configurado para as próximas etapas.'}
          </p>
          {canAdminister(profile.role) && (
            <Link className="button light" to="/admin">
              Acessar Administração
              <ArrowUpRight size={18} />
            </Link>
          )}
        </div>
        <div className="hero-art" aria-hidden="true">
          <div>
            <Layers size={72} />
          </div>
          <span>ESTRUTURA</span>
          <span>CONTROLE</span>
          <span>RASTREABILIDADE</span>
        </div>
      </section>
      {canAdminister(profile.role) && (
        <>
          <div className="section-heading">
            <h2>Prepare seu ambiente</h2>
            <span>Cadastros da fundação</span>
          </div>
          <div className="shortcut-grid">
            <Link className="shortcut" to="/admin/stock_positions">
              <FolderCog />
              <h3>Estrutura do estoque</h3>
              <p>Organize posições e seus níveis hierárquicos.</p>
              <span>
                Gerenciar posições <ArrowUpRight size={16} />
              </span>
            </Link>
            <Link className="shortcut" to="/admin/categories">
              <Layers />
              <h3>Classificação e regras</h3>
              <p>Defina categorias e requisitos de preparação.</p>
              <span>
                Gerenciar categorias <ArrowUpRight size={16} />
              </span>
            </Link>
            {profile.role === 'ADMIN' && (
              <Link className="shortcut" to="/admin/usuarios">
                <Users />
                <h3>Pessoas e acesso</h3>
                <p>Administre usuários, perfis e crachás.</p>
                <span>
                  Gerenciar usuários <ArrowUpRight size={16} />
                </span>
              </Link>
            )}
          </div>
        </>
      )}
      <div className="foundation-note">
        <ShieldCheck size={20} />
        <p>
          <strong>Acesso seguro e individualizado.</strong> Sua sessão será encerrada após 10
          minutos de inatividade.
        </p>
      </div>
    </>
  );
}
function AdminHome() {
  const { profile } = useAuth();
  return (
    <>
      <div className="page-heading">
        <div>
          <span className="eyebrow">CONFIGURAÇÃO DO AMBIENTE</span>
          <h1>Administração</h1>
          <p>Organize a estrutura, os cadastros e os acessos do estoque.</p>
        </div>
      </div>
      <div className="admin-grid">
        {adminGroups
          .filter((group) => group.label !== 'Acesso' || profile?.role === 'ADMIN')
          .map((group) => (
            <section className="panel admin-group" key={group.label}>
              <h2>{group.label}</h2>
              {group.items.map(([path, label]) => (
                <Link to={`/admin/${path}`} key={path}>
                  <span>
                    {label}
                    {!(path in catalog) && !['usuarios', 'acessos-excepcionais'].includes(path) && (
                      <small>Próxima etapa</small>
                    )}
                  </span>
                  <ArrowUpRight size={17} />
                </Link>
              ))}
            </section>
          ))}
      </div>
    </>
  );
}
function Placeholder() {
  return (
    <section className="panel">
      <Empty title="Em uma próxima etapa">Funcionalidade disponível em uma próxima etapa.</Empty>
      <div className="placeholder-action">
        <Link className="button" to="/">
          Voltar ao início
        </Link>
      </div>
    </section>
  );
}
const router = createHashRouter([
  {
    element: (
      <AuthProvider>
        <AuthGate />
      </AuthProvider>
    ),
    children: [
      {
        element: <Shell />,
        children: [
          { index: true, element: <HomePage /> },
          ...navigation
            .slice(1)
            .map(([path]) => ({ path: path.slice(1), element: <Placeholder /> })),
          {
            element: <AdminGate />,
            children: [
              { path: 'admin', element: <AdminHome /> },
              ...Object.keys(catalog).map((entity) => ({
                path: `admin/${entity}`,
                element: <MasterPage entity={entity as Entity} />,
              })),
              ...['materiais', 'ajustes', 'divergencias', 'fila', 'reimpressoes', 'alertas'].map(
                (path) => ({ path: `admin/${path}`, element: <Placeholder /> }),
              ),
              {
                element: <AdminGate onlyAdmin />,
                children: [
                  { path: 'admin/usuarios', element: <UsersPage /> },
                  { path: 'admin/acessos-excepcionais', element: <ExceptionalPage /> },
                ],
              },
            ],
          },
          { path: '*', element: <Navigate to="/" replace /> },
        ],
      },
    ],
  },
]);
export function App() {
  return <RouterProvider router={router} />;
}
