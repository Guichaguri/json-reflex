import type { StateContext } from '../../../src/core/context.js';

export interface ShortcutsProps {
  title: string;
  shortcuts: ShortcutItem[];
}

export interface ShortcutItem {
  id: string;
  label: string;
  href: string;
}

export function renderShortcuts(state: StateContext, props: ShortcutsProps) {
  const div = document.createElement('div');
  const h2 = document.createElement('h2');
  h2.textContent = props.title;
  const ul = document.createElement('ul');

  props.shortcuts.forEach((shortcut) => {
    const li = document.createElement('li');
    const a = document.createElement('button');
    a.textContent = shortcut.label;
    a.addEventListener('click', (event) => {
      event.preventDefault();
      state.setState([['currentShortcut', shortcut.id]]);
    });
    li.appendChild(a);
    ul.appendChild(li);
  });

  div.appendChild(h2);
  div.appendChild(ul);

  return div;
}
