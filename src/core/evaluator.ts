import type {
  BinaryExpression,
  CallExpression,
  ConditionalExpression,
  Expression,
  Identifier,
  Literal,
  UnaryExpression
} from 'jsep';
import type { ExpressionProcessorOptions } from './types.js';

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
      throw new Error(`Unsupported node type: ${node.type}`);
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
  options: ExpressionProcessorOptions,
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
          throw new Error(`Unsupported operator: ${binaryNode.operator}`);
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
          throw new Error(`Unsupported operator: ${unaryNode.operator}`);
      }
    case 'CallExpression':
      const callNode = node as CallExpression;

      if (callNode.callee.type === 'Identifier') {
        const functionName = (callNode.callee as Identifier).name;
        const func = options.functions.get(functionName);
        const args = callNode.arguments.map((arg: Expression) => evaluateNode(arg, context, options));

        if (func) {
          return func(...args);
        } else {
          throw new Error(`Function not found: ${functionName}`);
        }
      } else {
        throw new Error(`Unsupported callee type: ${callNode.callee.type}`);
      }
    default:
      throw new Error(`Unsupported node type: ${node.type}`);
  }
}
