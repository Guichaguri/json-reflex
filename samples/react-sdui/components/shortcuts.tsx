import { useExpressionState } from '../../../src/react/index.js';

export interface ShortcutsProps {
  title: string;
  shortcuts: ShortcutItem[];
}

export interface ShortcutItem {
  id: string;
  label: string;
  href: string;
  onClick?: { action: 'set-state', key: string, value: any };
}

export const Shortcuts = (props: ShortcutsProps) => {
  const state = useExpressionState();

  return (
    <div>
      <h2>{props.title}</h2>
      <ul>
        {props.shortcuts.map((shortcut) => (
          <li key={shortcut.id}>
            <button onClick={(e) => {
              if (shortcut.onClick) {
                e.preventDefault();
                if (shortcut.onClick.action === 'set-state') {
                  state.setState([[shortcut.onClick.key, shortcut.onClick.value]]);
                }
              }
            }}>{shortcut.label}</button>
          </li>
        ))}
      </ul>
    </div>
  );
};
