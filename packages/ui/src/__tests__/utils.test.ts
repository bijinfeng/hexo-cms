import { describe, it, expect } from 'vitest';
import { cn } from '../utils';

describe('cn utility', () => {
  it('should merge class names', () => {
    expect(cn('foo', 'bar')).toBe('foo bar');
  });

  it('should handle conditional classes with false', () => {
    const condition = false;
    expect(cn('foo', condition && 'bar')).toBe('foo');
  });

  it('should handle conditional classes with undefined', () => {
    expect(cn('foo', undefined)).toBe('foo');
  });

  it('should handle conditional classes with null', () => {
    expect(cn('foo', null)).toBe('foo');
  });

  it('should merge Tailwind conflicting classes', () => {
    // twMerge resolves conflicts — last one wins
    expect(cn('p-4', 'p-2')).toBe('p-2');
  });

  it('should handle object syntax', () => {
    expect(cn({ foo: true, bar: false })).toBe('foo');
  });

  it('should handle array syntax', () => {
    expect(cn(['foo', 'bar'])).toBe('foo bar');
  });

  it('should handle empty input', () => {
    expect(cn()).toBe('');
  });

  it('should handle empty string', () => {
    expect(cn('')).toBe('');
  });

  it('should merge multiple Tailwind classes correctly', () => {
    expect(cn('text-sm font-bold', 'text-lg')).toBe('font-bold text-lg');
  });
});
