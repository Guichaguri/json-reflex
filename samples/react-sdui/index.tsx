import { ExpressionStateProvider, useExpressionEngine } from '../../src/react/index.js';
import type { ExpressionProcessorOptions } from '../../src/core/types.js';
import { stdFunctions } from '../../src/std/functions.js';
import { useState } from 'react';
import { type ComponentItem, loadData } from './data.js';
import { Article } from './components/article.js';
import { Shortcuts } from './components/shortcuts.js';
import { createRoot } from 'react-dom/client';

const options: ExpressionProcessorOptions = {
  functions: stdFunctions,
};

const App = () => {
  return (
    <ExpressionStateProvider options={options}>
      <ComponentRenderer />
    </ExpressionStateProvider>
  );
};

const components: Record<string, React.FC<any>> = {
  article: Article,
  shortcuts: Shortcuts,
};

const DynamicComponent = (props: ComponentItem) => {
  const { evaluated } = useExpressionEngine(props);
  const Component = components[props.type];

  if (!Component) {
    return null;
  }

  return <Component {...evaluated} />;
};

const ComponentRenderer = () => {
  const [data] = useState(() => loadData());

  return (
    <>
      {data.map((item, i) => <DynamicComponent key={i} {...item} />)}
    </>
  )
};

createRoot(document.querySelector('main')!).render(<App />);
