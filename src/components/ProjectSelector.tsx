import { useState, useRef, useEffect, memo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, Plus, Pencil, Trash2, AlertTriangle } from 'lucide-react';
import type { ResumeProject } from '@/types/resumeProject';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/Toast';
import { dynamicIslandSpring } from '@/lib/motion';

interface ProjectSelectorProps {
  projects: ResumeProject[];
  currentProject: ResumeProject | undefined;
  onSwitch: (id: string) => void;
  onCreate: () => void;
  onRename: (id: string, newName: string) => void;
  onDelete: (id: string) => void;
}

export const ProjectSelector = memo(function ProjectSelector({
  projects,
  currentProject,
  onSwitch,
  onCreate,
  onRename,
  onDelete,
}: ProjectSelectorProps) {
   const [isOpen, setIsOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const { addToast } = useToast();

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
        setEditingId(null);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (editingId && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [editingId]);

  const handleRename = (project: ResumeProject) => {
    setEditingId(project.id);
    setEditingName(project.name);
  };

  const handleRenameSubmit = (id: string) => {
    const trimmed = editingName.trim();
    if (trimmed && trimmed !== projects.find(p => p.id === id)?.name) {
      onRename(id, trimmed);
    }
    setEditingId(null);
    setEditingName('');
  };

  const handleRenameKeyDown = (e: React.KeyboardEvent, id: string) => {
    if (e.key === 'Enter') {
      handleRenameSubmit(id);
    } else if (e.key === 'Escape') {
      setEditingId(null);
      setEditingName('');
    }
  };

   const handleDeleteClick = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (projects.length > 1) {
      setDeleteConfirmId(id);
    }
  };

  const confirmDelete = () => {
    if (deleteConfirmId) {
      onDelete(deleteConfirmId);
      addToast('简历已成功删除', 'success');
      setDeleteConfirmId(null);
    }
  };

  const handleSwitch = (id: string) => {
    onSwitch(id);
    setIsOpen(false);
  };

  return (
    <div className="relative min-w-0" ref={dropdownRef}>
      <motion.button
        onClick={() => setIsOpen(!isOpen)}
        className="app-secondary flex min-h-10 max-w-[132px] items-center gap-2 rounded-lg border px-3 py-1.5 text-sm transition-colors sm:min-h-0 sm:max-w-[180px]"
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
      >
        <span className="truncate font-medium">
          {currentProject?.name ?? '选择简历'}
        </span>
        <ChevronDown size={14} className={`transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </motion.button>

      <AnimatePresence>
        {isOpen && (
           <motion.div
            initial={{ opacity: 0, y: -8, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.96, filter: 'blur(4px)' }}
            transition={{ ...dynamicIslandSpring, stiffness: 300 }}
            className="app-panel absolute top-full left-0 mt-2 w-64 rounded-xl border py-1.5 z-50"
          >
            {projects.map(project => (
              <div
                key={project.id}
                className={`group flex items-center gap-2 px-3 py-2 cursor-pointer transition-colors ${
                  project.id === currentProject?.id
                    ? 'bg-[var(--app-accent-soft)]'
                    : 'hover:bg-[var(--app-surface-muted)]'
                }`}
                onClick={() => handleSwitch(project.id)}
              >
                <span className={`flex-1 truncate text-sm ${
                  project.id === currentProject?.id
                    ? 'font-medium text-[var(--secondary-foreground)]'
                    : 'text-[var(--muted-foreground)]'
                }`}>
                  {editingId === project.id ? (
                    <input
                      ref={inputRef}
                      type="text"
                      value={editingName}
                      onChange={e => setEditingName(e.target.value)}
                      onBlur={() => handleRenameSubmit(project.id)}
                      onKeyDown={e => handleRenameKeyDown(e, project.id)}
                      onClick={e => e.stopPropagation()}
                      className="w-full px-1 py-0.5 text-sm bg-white dark:bg-zinc-700 border border-zinc-300 dark:border-zinc-600 rounded outline-none"
                    />
                  ) : (
                    project.name
                  )}
                </span>

                {projects.length > 1 && (
                  <div className="hidden group-hover:flex items-center gap-1">
                    <button
                      onClick={e => { e.stopPropagation(); handleRename(project); }}
                      className="p-1 rounded hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-500 dark:text-zinc-400"
                      title="重命名"
                    >
                      <Pencil size={12} />
                    </button>
                     <button
                      onClick={e => handleDeleteClick(project.id, e)}
                      className="p-1 rounded hover:bg-red-100 dark:hover:bg-red-900/30 text-zinc-500 hover:text-red-600 dark:hover:text-red-400"
                      title="删除"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                )}
              </div>
            ))}

            <div className="border-t border-[var(--app-border)] mt-1 pt-1">
              <button
                onClick={() => { onCreate(); setIsOpen(false); }}
                className="app-control flex items-center gap-2 w-full px-3 py-2 text-sm transition-colors"
              >
                <Plus size={14} />
                <span>新建简历</span>
              </button>
            </div>
          </motion.div>
        )}
       </AnimatePresence>

      <Dialog open={!!deleteConfirmId} onOpenChange={(open) => !open && setDeleteConfirmId(null)}>
        <DialogContent className="max-w-[360px] p-0 overflow-hidden border-none shadow-2xl">
          <div className="relative p-7 flex flex-col items-center text-center">
            {/* 警示图标背光效果 */}
            <div className="relative mb-5">
              <div className="absolute inset-0 bg-red-500/20 dark:bg-red-500/30 blur-2xl rounded-full" />
              <div className="relative w-14 h-14 rounded-2xl bg-red-50 dark:bg-red-900/30 flex items-center justify-center border border-red-100 dark:border-red-800/50 shadow-sm">
                <AlertTriangle className="text-red-500 dark:text-red-400" size={28} strokeWidth={2.5} />
              </div>
            </div>

            <DialogTitle className="text-xl font-bold text-zinc-900 dark:text-zinc-100 mb-2 track-tight">
              确定要删除吗？
            </DialogTitle>
            
            <DialogDescription className="text-zinc-500 dark:text-zinc-400 text-sm leading-relaxed px-2">
              这份简历将被永久移除。操作完成后将<span className="text-red-500/80 dark:text-red-400/80 font-medium">无法恢复</span>，请确认。
            </DialogDescription>
          </div>

          <div className="flex gap-3 p-4 pt-0">
            <DialogClose render={
              <Button 
                variant="ghost" 
                className="flex-1 h-11 text-zinc-500 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 font-medium rounded-xl transition-all" 
              />
            }>
              取消
            </DialogClose>
            <Button 
              variant="destructive" 
              className="flex-1 h-11 bg-red-500 hover:bg-red-600 dark:bg-red-600 dark:hover:bg-red-500 text-white font-semibold rounded-xl shadow-lg shadow-red-500/20 transition-all active:scale-[0.98]" 
              onClick={confirmDelete}
            >
              确认删除
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
});
