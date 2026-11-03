import { describe, expectTypeOf, it } from 'vitest';
import type {
  AllowExpressions,
  Expression,
  ExpressionOrValue,
  ObjectWithExpressions,
  ObjectWithoutExpressions,
} from '../../src/core/types.js';

describe('ObjectWithoutExpressions', () => {
  it('strips expressions from values', () => {
    interface Props {
      title: ExpressionOrValue<string>;
      count: ExpressionOrValue<number>;
      plain: boolean;
    }

    expectTypeOf<ObjectWithoutExpressions<Props>>().toEqualTypeOf<{
      title: string;
      count: number;
      plain: boolean;
    }>();
  });

  it('strips expressions at any depth', () => {
    interface Props {
      nested: { value: ExpressionOrValue<string> };
      list: ExpressionOrValue<number>[];
    }

    expectTypeOf<ObjectWithoutExpressions<Props>>().toEqualTypeOf<{
      nested: { value: string };
      list: number[];
    }>();
  });

  it('turns a bare expression into unknown', () => {
    expectTypeOf<ObjectWithoutExpressions<{ value: Expression }>>().toEqualTypeOf<{ value: unknown }>();
  });
});

describe('AllowExpressions', () => {
  it('allows expressions for every primitive at any depth', () => {
    interface Props {
      title: string;
      nested: { count: number };
    }

    expectTypeOf<AllowExpressions<Props>>().toEqualTypeOf<{
      title: ExpressionOrValue<string>;
      nested: { count: ExpressionOrValue<number> };
    }>();
  });

  it('keeps functions as they are', () => {
    type Fn = (a: number) => void;

    expectTypeOf<AllowExpressions<{ onClick: Fn }>>().toEqualTypeOf<{ onClick: Fn }>();
  });

  it('is the inverse of ObjectWithoutExpressions', () => {
    interface Props {
      title: string;
      nested: { count: number; list: boolean[] };
    }

    expectTypeOf<ObjectWithoutExpressions<AllowExpressions<Props>>>().toEqualTypeOf<Props>();
  });
});

describe('ObjectWithExpressions', () => {
  it('accepts objects with expressions and plain values', () => {
    const obj = { a: { $expr: 'x' }, b: 'text', c: { d: [1, { $expr: 'y' }] } };

    expectTypeOf(obj).toExtend<ObjectWithExpressions<typeof obj>>();
  });

  it('rejects functions', () => {
    const obj = { fn: () => 1 };

    expectTypeOf(obj).not.toExtend<ObjectWithExpressions<typeof obj>>();
  });
});
