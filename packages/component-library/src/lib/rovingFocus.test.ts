import { describe, expect, it } from 'vitest';
import { moveFocus } from './rovingFocus';

function list(disabledIndex = -1) {
  const root = document.createElement('div');
  ['a', 'b', 'c'].forEach((name, i) => {
    const button = document.createElement('button');
    button.textContent = name;
    button.className = 'item';
    if (i === disabledIndex) button.disabled = true;
    root.appendChild(button);
  });
  document.body.appendChild(root);
  return root;
}

describe('moveFocus', () => {
  it('moves down, wraps, and moves up', () => {
    const root = list();
    expect(moveFocus(root, '.item', 'ArrowDown')).toBe(0);
    expect(moveFocus(root, '.item', 'ArrowDown')).toBe(1);
    expect(moveFocus(root, '.item', 'End')).toBe(2);
    expect(moveFocus(root, '.item', 'ArrowDown')).toBe(0);
    expect(moveFocus(root, '.item', 'ArrowUp')).toBe(2);
    expect(moveFocus(root, '.item', 'Home')).toBe(0);
    root.remove();
  });

  it('uses left and right for horizontal lists and skips disabled items', () => {
    const root = list(1);
    (root.firstChild as HTMLElement).focus();
    expect(moveFocus(root, '.item', 'ArrowRight', 'horizontal')).toBe(1);
    expect(document.activeElement?.textContent).toBe('c');
    expect(moveFocus(root, '.item', 'ArrowDown', 'horizontal')).toBe(-1);
    expect(moveFocus(root, '.item', 'ArrowLeft', 'horizontal')).toBe(0);
    root.remove();
  });

  it('ignores other keys and empty containers', () => {
    expect(moveFocus(null, '.item', 'ArrowDown')).toBe(-1);
    const root = list();
    expect(moveFocus(root, '.item', 'Enter')).toBe(-1);
    expect(moveFocus(root, '.none', 'ArrowDown')).toBe(-1);
    root.remove();
  });
});
