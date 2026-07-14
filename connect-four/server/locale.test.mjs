import { describe, it, expect } from 'vitest';
import { resolveLocale, serverT, SUPPORTED_LOCALES } from './locale.mjs';

describe('resolveLocale', () => {
  it('defaults to en when header missing', () => {
    expect(resolveLocale(undefined)).toBe('en');
  });
  it('picks es from a simple header', () => {
    expect(resolveLocale('es')).toBe('es');
  });
  it('picks es from a weighted header', () => {
    expect(resolveLocale('es-AR,es;q=0.9,en;q=0.8')).toBe('es');
  });
  it('falls back to en for unsupported', () => {
    expect(resolveLocale('fr-FR,fr;q=0.9')).toBe('en');
  });
  it('exposes the supported set', () => {
    expect(SUPPORTED_LOCALES).toEqual(['en', 'es']);
  });
});

describe('serverT', () => {
  it('returns es string for es locale', () => {
    expect(serverT('es', 'notABlunder')).toMatch(/mejor/i);
  });
  it('returns en string for en locale', () => {
    expect(serverT('en', 'notABlunder')).toMatch(/best track/i);
  });
  it('falls back to en for unknown locale', () => {
    expect(serverT('fr', 'notABlunder')).toMatch(/best track/i);
  });
});
