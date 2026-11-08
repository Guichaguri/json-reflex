import { createRoot } from 'react-dom/client';
import type { ExpressionOrValue, ExpressionEngineOptions } from '../../src/core/types.js';
import { ExpressionStateProvider, useExpressionEngine, useExpressionState } from '../../src/react/index.js';
import { stdFunctions } from '../../src/std/functions.js';

const options: ExpressionEngineOptions = {
  functions: stdFunctions,
};

const App = () => {
  return (
    <ExpressionStateProvider options={options}>
      <Article
        title={{ $expr: 'showBalance ? "Your balance:" : concat("Balance unavailable. Random number: ", num)' }}
        description={{ $expr: 'showBalance ? "100" : "****"' }}
      />
      <Article
        title="See more ways to do it"
        description={{ $expr: 'num > 0.5 ? "Random number is above 0.5" : "Random number is below 0.5"' }}
      />
      <Controls />
    </ExpressionStateProvider>
  )
};

const Controls = () => {
  const state = useExpressionState();

  return (
    <>
      <button onClick={() => state.setState([['showBalance', state.getState().get('showBalance') !== true]])}>
        Toggle Show Balance
      </button>
      <button onClick={() => state.setState([['num', Math.random()]])}>
        Generate random value for the random number
      </button>
    </>
  );
}

interface ArticleProps {
  title: ExpressionOrValue<string>,
  description: ExpressionOrValue<string>
}

const Article = (props: ArticleProps) => {
  const { evaluated } = useExpressionEngine(props);

  return (
    <article>
      <h2>{evaluated.title}</h2>
      <p>{evaluated.description}</p>
    </article>
  );
}

createRoot(document.querySelector('main')!).render(<App />);
