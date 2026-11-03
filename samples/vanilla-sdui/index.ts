import { ExpressionEngine } from '../../src/core/engine.js';
import { StateContext } from '../../src/core/context.js';
import type { ExpressionProcessorOptions } from '../../src/core/types.js';
import { stdFunctions } from '../../src/std/functions.js';
import { type ComponentItem, loadData } from './data.js';
import { renderArticle } from './components/article.js';
import { renderShortcuts } from './components/shortcuts.js';

const options: ExpressionProcessorOptions = {
  functions: stdFunctions,
};

const state = new StateContext();

const components: Record<string, (state: StateContext, props: any) => HTMLElement> = {
  article: renderArticle,
  shortcuts: renderShortcuts,
};

function renderComponents(container: HTMLElement) {
  const data = loadData();

  for (const item of data) {
    renderComponent(container, item);
  }
}

function renderComponent(container: HTMLElement, item: ComponentItem) {
  const render = components[item.type];

  if (!render) {
    return;
  }

  const engine = new ExpressionEngine(state, item, options);

  let element = render(state, engine.evaluated);
  container.appendChild(element);

  engine.subscribe(evaluated => {
    const newElement = render(state, evaluated);

    console.log('updatedd');

    container.replaceChild(newElement, element);
    element = newElement;
  });
}

renderComponents(document.querySelector('main')!);
