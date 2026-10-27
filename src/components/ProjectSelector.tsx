import { useState, useRef, useEffect, memo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { createPortal } from 'react-dom';
import { overlayTransition } from '@/lib/motion';
import { ChevronDown, Plus, Pencil, Trash2, Check, X } from 'lucide-react';
import type { ResumeProject } from '@/types/resumeProject';
import type { AppLanguage } from '@/config/ui';
import { useToast } from '@/components/ui/Toast';
interface Props { projects: ResumeProject[]; currentProject: ResumeProject | undefined; lang?: AppLanguage;
  onSwitch: (id: string) => void; onCreate: () => void; onRename: (id: string, name: string) => void; onDelete: (id: string) => void }
export const ProjectSelector = memo(function ProjectSelector({ projects, currentProject, lang = 'zh', onSwitch, onCreate, onRename, onDelete }: Props) {
  const [isOpen, setIsOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const { addToast } = useToast();
  const labels = lang === 'zh' ? { choose: '选择简历', rename: '重命名', remove: '删除', confirm: '确认删除', cancel: '取消', create: '新建简历', save: '保存名称', deleted: '简历已删除' }
    : { choose: 'Choose resume', rename: 'Rename', remove: 'Delete', confirm: 'Confirm delete', cancel: 'Cancel', create: 'New resume', save: 'Save name', deleted: 'Resume deleted' };
  const close = () => { setIsOpen(false); setEditingId(null); setDeleteId(null); triggerRef.current?.focus(); };
  useEffect(() => {
    const outside = (event: PointerEvent) => { if (!rootRef.current?.contains(event.target as Node) && !menuRef.current?.contains(event.target as Node)) { setIsOpen(false); setEditingId(null); setDeleteId(null); } };
    document.addEventListener('pointerdown', outside);
    return () => document.removeEventListener('pointerdown', outside);
  }, []);
  useEffect(() => { if (editingId) { inputRef.current?.focus(); inputRef.current?.select(); } }, [editingId]);
  useEffect(() => {
    if (!isOpen) return;
    const frame = requestAnimationFrame(() => menuRef.current?.querySelector<HTMLButtonElement>('[data-project-switch]')?.focus());
    const resize = () => setIsOpen(false);
    window.addEventListener('resize', resize);
    return () => { cancelAnimationFrame(frame); window.removeEventListener('resize', resize); };
  }, [isOpen]);
  const rename = (id: string) => {
    if (editingName.trim()) onRename(id, editingName.trim());
    setEditingId(null);
    requestAnimationFrame(() => menuRef.current?.querySelector<HTMLButtonElement>('[data-project-switch]')?.focus());
  };
  const action = 'app-control ui-menu-action inline-flex shrink-0 items-center justify-center';
  const anchor = isOpen ? triggerRef.current?.getBoundingClientRect() : null;
  return <div ref={rootRef} className="relative min-w-0">
    <button ref={triggerRef} type="button" data-testid="project-selector" aria-label={`${labels.choose}: ${currentProject?.name ?? ''}`}
      aria-expanded={isOpen} aria-controls="project-list" onClick={() => setIsOpen(value => !value)}
      onKeyDown={event => { if (event.key === 'ArrowDown') { event.preventDefault(); setIsOpen(true); } }}
      className="app-secondary flex min-h-10 max-w-[min(132px,30vw)] items-center gap-2 rounded-lg border px-3 text-sm sm:max-w-[180px] sm:min-h-8" title={currentProject?.name}>
      <span className="truncate font-medium">{currentProject?.name ?? labels.choose}</span><ChevronDown size={14} className="shrink-0" />
    </button>
    {createPortal(<AnimatePresence>{isOpen && <motion.div ref={menuRef} id="project-list" role="group" tabIndex={-1} aria-label={labels.choose}
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={overlayTransition}
      style={{ top: Math.max(12, Math.min((anchor?.bottom ?? 56) + 8, window.innerHeight - 200)), left: Math.max(12, Math.min((anchor?.right ?? window.innerWidth - 12) - 320, window.innerWidth - 332)) }}
      onKeyDown={event => {
        if (event.key === 'Escape') { event.preventDefault(); close(); }
        if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
          event.preventDefault(); const buttons = Array.from(event.currentTarget.querySelectorAll<HTMLButtonElement>('button[data-project-switch]'));
          const index = buttons.indexOf(document.activeElement as HTMLButtonElement);
          buttons[(index + (event.key === 'ArrowDown' ? 1 : buttons.length - 1)) % buttons.length]?.focus();
        }
      }} className="app-ui app-panel ui-menu fixed w-[min(320px,calc(100vw-24px))] max-h-[60dvh] overflow-auto rounded-xl border p-2 z-[120]">
      {projects.map(project => <div key={project.id} data-selected={project.id === currentProject?.id} className="ui-project-row flex items-center gap-1">
        {editingId === project.id ? <>
          <input ref={inputRef} aria-label={`${labels.rename}: ${project.name}`} value={editingName} onChange={event => setEditingName(event.target.value)}
            onKeyDown={event => { if (event.key === 'Enter') rename(project.id); if (event.key === 'Escape') { event.stopPropagation(); setEditingId(null); } }}
            className="w-full min-w-0 rounded-lg border p-2 bg-[var(--app-surface)]" />
          <button className={action} aria-label={labels.save} onClick={() => rename(project.id)}><Check size={16} /></button>
        </> : <button type="button" data-project-switch aria-pressed={project.id === currentProject?.id}
          className="app-control ui-menu-item ui-project-choice"
          onClick={() => { onSwitch(project.id); close(); }}><span className="ui-project-marker">{project.id === currentProject?.id && <Check />}</span><span className="min-w-0 break-words text-start" title={project.name}>{project.name}</span></button>}
        {deleteId === project.id ? <>
          <button className={action} aria-label={labels.confirm} onClick={() => { onDelete(project.id); setDeleteId(null); addToast(labels.deleted, 'success'); }}><Check size={16} /></button>
          <button className={action} aria-label={labels.cancel} onClick={() => setDeleteId(null)}><X size={16} /></button>
        </> : <>
          <button className={action} aria-label={`${labels.rename}: ${project.name}`} onClick={() => { setEditingId(project.id); setEditingName(project.name); }}><Pencil size={16} /></button>
          <button className={action} data-destructive aria-label={`${labels.remove}: ${project.name}`} disabled={projects.length <= 1} onClick={() => setDeleteId(project.id)}><Trash2 size={16} /></button>
        </>}
      </div>)}
      <div className="ui-menu-separator" /><button type="button" className="app-control ui-menu-item"
        onClick={() => { onCreate(); close(); }}><Plus size={16} />{lang === 'zh' ? '新建简历' : 'New resume'}</button>
    </motion.div>}</AnimatePresence>, document.body)}
  </div>;
});
