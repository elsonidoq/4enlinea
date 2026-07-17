import { describe, it, expect } from 'vitest';
import { resolveLocale, serverT, SUPPORTED_LOCALES, resolveTtsLocale } from './locale.mjs';

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

describe('resolveTtsLocale', () => {
  it('uses the explicit ?lang= param when it is a supported locale', () => {
    expect(resolveTtsLocale('es', 'en')).toBe('es');
  });
  it('falls back to the given fallback when lang is missing', () => {
    expect(resolveTtsLocale(undefined, 'es')).toBe('es');
  });
  it('falls back to the given fallback when lang is unsupported', () => {
    expect(resolveTtsLocale('fr', 'es')).toBe('es');
  });
  it('falls back to en by default when no fallback is passed', () => {
    expect(resolveTtsLocale('fr')).toBe('en');
  });
  it('ignores non-string lang values', () => {
    expect(resolveTtsLocale(['es', 'en'], 'en')).toBe('en');
  });
});
