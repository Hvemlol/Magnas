import { describe, it, expect } from 'vitest';
import { safeHref } from '../utils/safeHref';

describe('safeHref', () => {
  it('returns # for null', ()      => expect(safeHref(null)).toBe('#'));
  it('returns # for undefined', () => expect(safeHref(undefined)).toBe('#'));
  it('returns # for empty string', () => expect(safeHref('')).toBe('#'));

  it('passes through a valid https URL', () =>
    expect(safeHref('https://example.com')).toBe('https://example.com/'));

  it('passes through a valid http URL', () =>
    expect(safeHref('http://example.com')).toBe('http://example.com/'));

  it('prepends https:// when no scheme is present', () =>
    expect(safeHref('example.com')).toBe('https://example.com/'));

  it('prepends https:// for www URLs without a scheme', () =>
    expect(safeHref('www.example.com/path')).toBe('https://www.example.com/path'));

  it('blocks javascript: URIs', () =>
    expect(safeHref('javascript:alert(1)')).toBe('#'));

  it('blocks javascript: URIs that start with https-lookalike prefix', () =>
    expect(safeHref('javascript:void(0)')).toBe('#'));

  it('blocks data: URIs', () =>
    expect(safeHref('data:text/html,<script>alert(1)</script>')).toBe('#'));

  it('blocks vbscript: URIs', () =>
    expect(safeHref('vbscript:msgbox(1)')).toBe('#'));

  it('returns # for completely unparseable input', () =>
    expect(safeHref('://bad url here')).toBe('#'));
});
