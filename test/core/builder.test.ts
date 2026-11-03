import { describe, expect, it } from 'vitest';
import { buildExpression } from '../../src/core/builder.js';
import type { ExpressionProcessorOptions } from '../../src/core/types.js';

const options: ExpressionProcessorOptions = {
  functions: new Map([['upper', (s: string) => s.toUpperCase()]]),
};

describe('buildExpression', () => {
  it('returns a function that evaluates the expression against a context', () => {
    const evaluate = buildExpression('a + b', new Set(), options);

    expect(evaluate(new Map([['a', 1], ['b', 2]]))).toBe(3);
    expect(evaluate(new Map([['a', 10], ['b', 20]]))).toBe(30);
  });

  it('adds the expression variables to the dependency set', () => {
    const dependencies = new Set(['existing']);
    buildExpression('a ? upper(b) : c', dependencies, options);

    expect([...dependencies]).toEqual(['existing', 'a', 'b', 'c']);
  });

  it('uses the functions from the options', () => {
    const evaluate = buildExpression('upper(name)', new Set(), options);

    expect(evaluate(new Map([['name', 'john']]))).toBe('JOHN');
  });

  it('throws on invalid syntax', () => {
    expect(() => buildExpression('a +', new Set(), options)).toThrow();
  });

  it('throws on unsupported nodes while building', () => {
    expect(() => buildExpression('a.b', new Set(), options)).toThrow('Unsupported node type: MemberExpression');
  });
});
