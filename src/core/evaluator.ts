import type {
  BinaryExpression,
  CallExpression,
  ConditionalExpression,
  Expression,
  Identifier,
  Literal,
  UnaryExpression
} from 'jsep';
import type { ExpressionEngineOptions } from './types.js';

/**
 * Readable names for the jsep nodes that are parsed but not supported.
 */
const unsupportedSyntax: Record<string, string> = {
  MemberExpression: 'property access (like "user.name" or "list[0]")',
  ArrayExpression: 'array literals (like "[1, 2]")',
  Compound: 'multiple expressions (separated by "," or ";")',
  SequenceExpression: 'multiple expressions (separated by ",")',
  ThisExpression: '"this"',
};

function unsupportedNode(node: Expression): Error {
  return new Error(`Unsupported syntax: ${unsupportedSyntax[node.type] ?? node.type}`);
}

function unsupportedOperator(operator: string): Error {
  return new Error(`Unsupported operator: ${operator}`);
}

/**
 * Walks through all nodes and extracts the dependencies.
 *
 * @param node The node to walk through
 * @param dependencies The dependency set, which will be incremented when an identifier is found
 */
export function extractDependencies(
  node: Expression,
  dependencies: Set<string>,
): void {
  switch (node.type) {
    case 'Identifier':
      dependencies.add((node as Identifier).name);
      break;
    case 'BinaryExpression':
      extractDependencies((node as BinaryExpression).left, dependencies);
      extractDependencies((node as BinaryExpression).right, dependencies);
      break;
    case 'Literal':
      // Literals do not have dependencies
      break;
    case 'ConditionalExpression':
      extractDependencies((node as ConditionalExpression).test, dependencies);
      extractDependencies((node as ConditionalExpression).consequent, dependencies);
      extractDependencies((node as ConditionalExpression).alternate, dependencies);
      break;
    case 'UnaryExpression':
      extractDependencies((node as UnaryExpression).argument, dependencies);
      break;
    case 'CallExpression':
      const callNode = node as CallExpression;
      for (const arg of callNode.arguments) {
        extractDependencies(arg, dependencies);
      }
      break;
    default:
      throw unsupportedNode(node);
  }
}

/**
 * Evaluates an expression node and returns the result.
 *
 * @param node The expression node
 * @param context The state context
 * @param options The options for evaluating
 */
export function evaluateNode(
  node: Expression,
  context: Map<string, any>,
  options: ExpressionEngineOptions,
): any {
  switch (node.type) {
    case 'BinaryExpression':
      const binaryNode = node as BinaryExpression;
      const left = evaluateNode(binaryNode.left, context, options);

      // Logical operators short-circuit, so the right side is only evaluated when needed
      if (binaryNode.operator === '&&') {
        return left && evaluateNode(binaryNode.right, context, options);
      } else if (binaryNode.operator === '||') {
        return left || evaluateNode(binaryNode.right, context, options);
      }

      const right = evaluateNode(binaryNode.right, context, options);
      switch (binaryNode.operator) {
        case '+':
          return left + right;
        case '-':
          return left - right;
        case '*':
          return left * right;
        case '/':
          return left / right;
        case '%':
          return left % right;
        case '==':
          return left == right;
        case '!=':
          return left != right;
        case '===':
          return left === right;
        case '!==':
          return left !== right;
        case '<':
          return left < right;
        case '<=':
          return left <= right;
        case '>':
          return left > right;
        case '>=':
          return left >= right;
        default:
          throw unsupportedOperator(binaryNode.operator);
      }
    case 'Literal':
      const literalNode = node as Literal;
      return literalNode.value;
    case 'Identifier':
      const identifierNode = node as Identifier;
      return context.get(identifierNode.name);
    case 'ConditionalExpression':
      const conditionalNode = node as ConditionalExpression;
      const test = evaluateNode(conditionalNode.test, context, options);
      return test ? evaluateNode(conditionalNode.consequent, context, options) : evaluateNode(conditionalNode.alternate, context, options);
    case 'UnaryExpression':
      const unaryNode = node as UnaryExpression;
      const argument = evaluateNode(unaryNode.argument, context, options);
      switch (unaryNode.operator) {
        case '!':
          return !argument;
        case '-':
          return -argument;
        case '+':
          return +argument;
        default:
          throw unsupportedOperator(unaryNode.operator);
      }
    case 'CallExpression':
      const callNode = node as CallExpression;

      if (callNode.callee.type === 'Identifier') {
        const functionName = (callNode.callee as Identifier).name;
        const func = options.functions?.get(functionName);
        const args = callNode.arguments.map((arg: Expression) => evaluateNode(arg, context, options));

        if (func) {
          return func(...args);
        } else {
          throw new Error(`Unknown function "${functionName}". Only functions in options.functions can be called`);
        }
      } else {
        throw new Error(callNode.callee.type === 'MemberExpression'
          ? 'Unsupported syntax: method calls (like "name.trim()"). Call a function instead, like "trim(name)"'
          : `Unsupported syntax: only named functions can be called, like "max(a, b)"`);
      }
    default:
      throw unsupportedNode(node);
  }
}
