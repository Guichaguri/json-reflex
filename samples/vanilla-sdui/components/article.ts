import type { StateContext } from '../../../src/core/context.js';

export interface ArticleProps {
  title: string;
  description: string;
}

export function renderArticle(state: StateContext, props: ArticleProps) {
  const article = document.createElement('article');
  const h2 = document.createElement('h2');
  h2.textContent = props.title;
  const p = document.createElement('p');
  p.textContent = props.description;

  article.appendChild(h2);
  article.appendChild(p);

  return article;
}
