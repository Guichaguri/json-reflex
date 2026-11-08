import type { ArticleProps } from './components/article.js';
import type { ShortcutsProps } from './components/shortcuts.js';
import type { AllowExpressions } from '../../src/core/types.js';

type CustomComponent<N extends string, T> = AllowExpressions<T> & { type: N; }

export type ComponentItem =
  CustomComponent<'article', ArticleProps> | CustomComponent<'shortcuts', ShortcutsProps>;

export function loadData(): ComponentItem[] {
  return [
    {
      type: 'article',
      title: 'Article 1',
      description: 'This is the first article.',
    },
    {
      type: 'shortcuts',
      title: 'Shortcuts',
      shortcuts: [
        {
          id: 'shortcut-1',
          label: { $expr: 'currentShortcut == "shortcut-1" ? "You clicked me" : "Shortcut 1"' },
          href: '#',
          onClick: { action: 'set-state', key: 'currentShortcut', value: 'shortcut-1' },
        },
        {
          id: 'shortcut-2',
          label: 'Shortcut 2',
          href: '#',
          onClick: { action: 'set-state', key: 'currentShortcut', value: 'shortcut-2' },
        },
        {
          id: 'shortcut-3',
          label: 'Shortcut 3',
          href: '#',
          onClick: { action: 'set-state', key: 'currentShortcut', value: 'shortcut-3' },
        }
      ],
    },
    {
      type: 'article',
      title: 'Article 2',
      description: { $expr: 'currentShortcut == "shortcut-2" ? "You clicked the second shortcut!" : "This is the second article."' },
    },
  ];
}
