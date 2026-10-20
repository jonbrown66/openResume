export interface EditorSelection {
  key: string;
  start: number | null;
  end: number | null;
  direction: 'forward' | 'backward' | 'none' | null;
}
export interface EditContext {
  group?: string;
  separate?: boolean;
  composing?: boolean;
  beforeSelection?: EditorSelection;
}
export function readEditorSelection(element: Element | null): EditorSelection | undefined {
  if (!(element instanceof HTMLTextAreaElement || element instanceof HTMLInputElement)) return;
  return { key: element.hasAttribute('data-code-editor') ? 'markdown' : element.id,
    start: element.selectionStart, end: element.selectionEnd, direction: element.selectionDirection };
}
export function restoreEditorSelection(selection: EditorSelection | undefined, root: HTMLElement | null) {
  if (!selection || !root) return;
  const element = selection.key === 'markdown' ? root.querySelector('[data-code-editor]') : document.getElementById(selection.key);
  if (!(element instanceof HTMLTextAreaElement || element instanceof HTMLInputElement)) return;
  if (!root.contains(element) || element.closest('[hidden]')) return;
  element.focus({ preventScroll: true });
  if (selection.start !== null && selection.end !== null) element.setSelectionRange(selection.start, selection.end, selection.direction ?? undefined);
}
