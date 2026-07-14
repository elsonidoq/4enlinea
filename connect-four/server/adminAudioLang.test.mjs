import { describe, it, expect } from 'vitest';
import { resolveAdminLang } from './adminAudioLang.mjs';

describe('resolveAdminLang', () => {
  it('returns "es" for raw="es"', () => {
    expect(resolveAdminLang('es')).toBe('es');
  });

  it('returns "en" for raw="en"', () => {
    expect(resolveAdminLang('en')).toBe('en');
  });

  it('defaults to "en" for undefined', () => {
    expect(resolveAdminLang(undefined)).toBe('en');
  });

  it('defaults to "en" for an unsupported locale like "fr"', () => {
    expect(resolveAdminLang('fr')).toBe('en');
  });

  it('defaults to "en" for a non-string value', () => {
    expect(resolveAdminLang(123)).toBe('en');
    expect(resolveAdminLang(null)).toBe('en');
    expect(resolveAdminLang({})).toBe('en');
  });

  it('honors an explicit fallback', () => {
    expect(resolveAdminLang('fr', 'es')).toBe('es');
    expect(resolveAdminLang(undefined, 'es')).toBe('es');
  });
});
