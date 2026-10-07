import { useEffect } from 'react';
import { useBlocker } from 'react-router-dom';
export function useUnsaved(dirty: boolean) {
  const blocker = useBlocker(dirty);
  useEffect(() => {
    if (blocker.state === 'blocked') {
      if (window.confirm('Existem alterações não salvas. Deseja sair?')) blocker.proceed();
      else blocker.reset();
    }
  }, [blocker]);
  useEffect(() => {
    const logout = (event: Event) => {
      if (dirty && !window.confirm('Existem alterações não salvas. Deseja sair?')) {
        event.preventDefault();
      }
    };
    const before = (event: BeforeUnloadEvent) => {
      if (dirty) {
        event.preventDefault();
        event.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', before);
    window.addEventListener('estoque:before-logout', logout);
    return () => {
      window.removeEventListener('beforeunload', before);
      window.removeEventListener('estoque:before-logout', logout);
    };
  }, [dirty]);
}
