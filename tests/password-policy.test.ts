import { describe, expect, it } from 'vitest';
import {
  validNewPassword,
  requireNewPassword,
} from '../supabase/functions/_shared/password-policy';
describe('Política central de novas senhas', () => {
  it.each([
    ['menos de oito', 'Abc12!x'],
    ['sem letra', '1234567!'],
    ['sem número', 'abcdefgh!'],
    ['sem especial', 'abcdefg1'],
    ['espaço não é especial', 'abcdef1 '],
    ['acima do limite existente', 'Ab1!' + 'x'.repeat(125)],
  ])('rejeita %s', (_, password) => {
    expect(validNewPassword(password)).toBe(false);
    expect(() => requireNewPassword(password)).toThrow('PASSWORD_POLICY');
  });
  it.each(['abcdef1!', 'ABCDEF1!', 'Senha123!', 'Árvore1!', 'abcdef1🙂'])(
    'aceita uma senha válida sem exigir ambas as caixas de letras',
    (password) => {
      expect(validNewPassword(password)).toBe(true);
      expect(requireNewPassword(password)).toBe(password);
    },
  );
  it('não normaliza, remove espaços ou devolve valor sensível em erros', () => {
    expect(requireNewPassword(' abcdef1! ')).toBe(' abcdef1! ');
    expect(() => requireNewPassword('secreto')).toThrow(/^PASSWORD_POLICY$/);
    expect(validNewPassword(null)).toBe(false);
  });
});
