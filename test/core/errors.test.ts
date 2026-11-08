import { describe, expect, it } from 'vitest';
import { ExpressionError } from '../../src/core/errors.js';

describe('ExpressionError', () => {
  it('describes the expression, its path and the cause', () => {
    const cause = new Error('Something broke');
    const error = new ExpressionError('a + b', ['items', '0', 'title'], 'evaluate', cause);

    expect(error).toBeInstanceOf(Error);
    expect(error.name).toBe('ExpressionError');
    expect(error.message).toBe('Failed to evaluate expression "a + b" at "items.0.title": Something broke');
    expect(error.expression).toBe('a + b');
    expect(error.path).toEqual(['items', '0', 'title']);
    expect(error.phase).toBe('evaluate');
    expect(error.cause).toBe(cause);
  });

  it('uses "(root)" when the path is empty', () => {
    const error = new ExpressionError('a +', [], 'parse', new Error('Invalid'));

    expect(error.message).toBe('Failed to parse expression "a +" at "(root)": Invalid');
  });

  it('converts a cause that is not an Error to a string', () => {
    const error = new ExpressionError('f()', ['value'], 'evaluate', 'plain string');

    expect(error.message).toBe('Failed to evaluate expression "f()" at "value": plain string');
    expect(error.cause).toBe('plain string');
  });
});
