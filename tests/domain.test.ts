import { describe, expect, it } from 'vitest';
import { BadgeScanner, expired, IDLE_MS } from '../src/features/auth/session';
import { canAdminister, positionPath, validCnpj, validateMaster } from '../src/domain/model';
import { hashPin, hashToken, randomToken, verifyPin } from '../supabase/functions/_shared/security';
import { businessCode } from '../supabase/functions/_shared/errors';
describe('Contratos da fundação', () => {
  it('timeout no limite exato de dez minutos', () => {
    expect(expired(1000, 1000 + IDLE_MS - 1)).toBe(false);
    expect(expired(1000, 1000 + IDLE_MS)).toBe(true);
  });
  it('scanner recebe token opaco rápido e rejeita digitação lenta e códigos operacionais', () => {
    const token = 'a'.repeat(64);
    const scanner = new BadgeScanner();
    [...token].forEach((key, i) => scanner.push(key, i * 10));
    expect(scanner.push('Enter', 640)).toBe(token);
    [...token].forEach((key, i) => scanner.push(key, 1000 + i * 100));
    expect(scanner.push('Enter', 7500)).toBeNull();
    [...'POS-00001'].forEach((key, i) => scanner.push(key, 8000 + i * 10));
    expect(scanner.push('Enter', 8090)).toBeNull();
  });
  it('categoria aceita preferencial vazia e exige POS de triagem', () => {
    expect(validateMaster('categories', { name: 'Rede', preferred_position_id: null })).toEqual({});
    expect(validateMaster('categories', { name: 'Rede', triage_on_return: true })).toHaveProperty(
      'triage_position_id',
    );
  });
  it('CNPJ numérico e alfanumérico usam dígitos verificadores', () => {
    expect(validCnpj('11.222.333/0001-81')).toBe(true);
    expect(validCnpj('12.ABC.345/01DE-35')).toBe(true);
    expect(validCnpj('11.222.333/0001-00')).toBe(false);
    expect(validCnpj('00.000.000/0000-00')).toBe(false);
  });
  it('hierarquia dinâmica exibe caminho completo', () => {
    expect(
      positionPath('b', [
        { id: 'a', name: 'Rack', active: true, version: 1 },
        { id: 'b', name: 'Caixa', parent_id: 'a', active: true, version: 1 },
      ]),
    ).toBe('Rack › Caixa');
  });
  it('somente Admin e Controlador administram', () => {
    expect(canAdminister('ADMIN')).toBe(true);
    expect(canAdminister('STOCK_CONTROLLER')).toBe(true);
    for (const role of ['IT', 'MONITORING', 'THIRD_PARTY'] as const)
      expect(canAdminister(role)).toBe(false);
  });
  it('erros internos não são traduzidos em mensagens públicas arbitrárias', () => {
    expect(businessCode({ message: 'sensitive postgres detail' })).toBeUndefined();
    expect(businessCode({ message: 'LAST_ADMIN' })).toBe('LAST_ADMIN');
  });
  it('token QR aleatório tem 256 bits e hash independente', async () => {
    const token = randomToken();
    expect(token).toMatch(/^[a-f0-9]{64}$/);
    expect(randomToken()).not.toBe(token);
    expect(await hashToken(token)).not.toBe(token);
  });
  it('PIN correto, incorreto e hash inválido', async () => {
    const hash = await hashPin('839274');
    expect(await verifyPin('839274', hash)).toBe(true);
    expect(await verifyPin('839275', hash)).toBe(false);
    expect(await verifyPin('839274', 'invalid')).toBe(false);
    expect(hash).not.toContain('839274');
  }, 10000);
});
