import jsep from 'jsep';
import { describe, expect, it, vi } from 'vitest';
import { evaluateNode, extractDependencies } from '../../src/core/evaluator.js';
import type { ExpressionEngineOptions } from '../../src/core/types.js';

const options: ExpressionEngineOptions = { functions: new Map() };

function evaluate(
  expression: string,
  state: Record<string, any> = {},
  opts: ExpressionEngineOptions = options,
): any {
  return evaluateNode(jsep(expression), new Map(Object.entries(state)), opts);
}

function dependenciesOf(expression: string): string[] {
  const dependencies = new Set<string>();
  extractDependencies(jsep(expression), dependencies);
  return [...dependencies];
}

describe('extractDependencies', () => {
  it('extracts a single identifier', () => {
    expect(dependenciesOf('a')).toEqual(['a']);
  });

  it('extracts nothing from literals', () => {
    expect(dependenciesOf('"text"')).toEqual([]);
    expect(dependenciesOf('42')).toEqual([]);
  });

  it('extracts identifiers from binary expressions', () => {
    expect(dependenciesOf('a + b * c')).toEqual(['a', 'b', 'c']);
  });

  it('extracts identifiers from conditional expressions', () => {
    expect(dependenciesOf('a ? b : c')).toEqual(['a', 'b', 'c']);
  });

  it('extracts identifiers from unary expressions', () => {
    expect(dependenciesOf('!a')).toEqual(['a']);
  });

  it('extracts identifiers from call arguments but not the callee', () => {
    expect(dependenciesOf('fn(a, 1, b)')).toEqual(['a', 'b']);
  });

  it('deduplicates identifiers', () => {
    expect(dependenciesOf('a + a')).toEqual(['a']);
  });

  it('adds to an existing set', () => {
    const dependencies = new Set(['x']);
    extractDependencies(jsep('y'), dependencies);

    expect([...dependencies]).toEqual(['x', 'y']);
  });

  it('throws on unsupported node types', () => {
    expect(() => dependenciesOf('a.b')).toThrow('Unsupported node type: MemberExpression');
    expect(() => dependenciesOf('[1, 2]')).toThrow('Unsupported node type: ArrayExpression');
  });
});

describe('evaluateNode', () => {
  describe('literals and identifiers', () => {
    it('evaluates literals', () => {
      expect(evaluate('42')).toBe(42);
      expect(evaluate('"text"')).toBe('text');
      expect(evaluate('true')).toBe(true);
      expect(evaluate('null')).toBe(null);
    });

    it('reads identifiers from the context', () => {
      expect(evaluate('a', { a: 'value' })).toBe('value');
    });

    it('returns undefined for missing identifiers', () => {
      expect(evaluate('missing')).toBeUndefined();
    });
  });

  describe('binary expressions', () => {
    it.each([
      ['1 + 2', 3],
      ['"a" + "b"', 'ab'],
      ['5 - 2', 3],
      ['3 * 4', 12],
      ['10 / 4', 2.5],
      ['7 % 3', 1],
      ['1 == 1', true],
      ['1 == "1"', true],
      ['1 != 2', true],
      ['1 != "1"', false],
      ['1 === 1', true],
      ['1 === "1"', false],
      ['1 !== "1"', true],
      ['1 !== 1', false],
      ['true && "yes"', 'yes'],
      ['0 && "yes"', 0],
      ['"" || "fallback"', 'fallback'],
      ['"value" || "fallback"', 'value'],
      ['1 < 2', true],
      ['2 <= 2', true],
      ['1 > 2', false],
      ['2 >= 3', false],
    ])('evaluates %s', (expression, expected) => {
      expect(evaluate(expression)).toBe(expected);
    });

    it('respects operator precedence', () => {
      expect(evaluate('1 + 2 * 3')).toBe(7);
      expect(evaluate('(1 + 2) * 3')).toBe(9);
    });

    it('uses identifiers as operands', () => {
      expect(evaluate('a * b', { a: 3, b: 5 })).toBe(15);
    });

    it('combines logical operators with comparisons', () => {
      expect(evaluate('a > 1 && b < 5', { a: 2, b: 3 })).toBe(true);
      expect(evaluate('a > 1 || b < 5', { a: 0, b: 10 })).toBe(false);
    });

    it('short-circuits && when the left side is falsy', () => {
      const fn = vi.fn();
      const opts = { functions: new Map([['fn', fn]]) };
      evaluate('false && fn()', {}, opts);

      expect(fn).not.toHaveBeenCalled();
    });

    it('short-circuits || when the left side is truthy', () => {
      const fn = vi.fn();
      const opts = { functions: new Map([['fn', fn]]) };
      evaluate('true || fn()', {}, opts);

      expect(fn).not.toHaveBeenCalled();
    });

    it.each(['1 & 2', '1 | 2', '1 ^ 2', '1 << 2', '1 >> 2', '1 >>> 2'])('throws on unsupported operator in %s', (expression) => {
      expect(() => evaluate(expression)).toThrow(/^Unsupported operator: /);
    });
  });

  describe('conditional expressions', () => {
    it('evaluates the consequent when the test is truthy', () => {
      expect(evaluate('a ? "yes" : "no"', { a: 1 })).toBe('yes');
    });

    it('evaluates the alternate when the test is falsy', () => {
      expect(evaluate('a ? "yes" : "no"', { a: 0 })).toBe('no');
    });

    it('only evaluates the selected branch', () => {
      const fn = vi.fn();
      const opts = { functions: new Map([['fn', fn]]) };
      evaluate('true ? 1 : fn()', {}, opts);

      expect(fn).not.toHaveBeenCalled();
    });
  });

  describe('unary expressions', () => {
    it('evaluates !', () => {
      expect(evaluate('!a', { a: true })).toBe(false);
      expect(evaluate('!a', {})).toBe(true);
    });

    it('evaluates -', () => {
      expect(evaluate('-a', { a: 5 })).toBe(-5);
    });

    it('evaluates +', () => {
      expect(evaluate('+a', { a: '5' })).toBe(5);
    });

    it('throws on unsupported operators', () => {
      expect(() => evaluate('~a', { a: 1 })).toThrow('Unsupported operator: ~');
    });
  });

  describe('call expressions', () => {
    it('calls the registered function with evaluated arguments', () => {
      const sum = vi.fn((a: number, b: number) => a + b);
      const opts = { functions: new Map([['sum', sum]]) };

      expect(evaluate('sum(a, 2)', { a: 1 }, opts)).toBe(3);
      expect(sum).toHaveBeenCalledWith(1, 2);
    });

    it('calls functions without arguments', () => {
      const opts = { functions: new Map([['now', () => 'now']]) };

      expect(evaluate('now()', {}, opts)).toBe('now');
    });

    it('supports nested calls', () => {
      const opts = { functions: new Map([['double', (n: number) => n * 2]]) };

      expect(evaluate('double(double(a))', { a: 3 }, opts)).toBe(12);
    });

    it('throws when the function is not registered', () => {
      expect(() => evaluate('unknown()')).toThrow('Function not found: unknown');
    });

    it('throws when the callee is not an identifier', () => {
      expect(() => evaluate('a.b()')).toThrow('Unsupported callee type: MemberExpression');
    });
  });

  it('throws on unsupported node types', () => {
    expect(() => evaluate('a.b')).toThrow('Unsupported node type: MemberExpression');
  });
});
