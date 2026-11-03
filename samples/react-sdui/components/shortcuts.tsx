import { useExpressionState } from '../../../src/react/index.js';

export interface ShortcutsProps {
  title: string;
  shortcuts: ShortcutItem[];
}

export interface ShortcutItem {
  id: string;
  label: string;
  href: string;
}

export const Shortcuts = (props: ShortcutsProps) => {
  const state = useExpressionState();

  return (
    <div>
      <h2>{props.title}</h2>
      <ul>
        {props.shortcuts.map((shortcut) => (
          <li key={shortcut.id}>
            <button onClick={() => {
              state.setState([['currentShortcut', shortcut.id]]);
            }}>{shortcut.label}</button>
          </li>
        ))}
      </ul>
    </div>
  );
};
