import { useState, useRef, useEffect, memo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, Plus, Pencil, Trash2, Check, X } from 'lucide-react';
import type { ResumeProject } from '@/types/resumeProject';
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
            className="app-panel absolute top-full left-0 mt-2 w-64 rounded-xl border p-1.5 z-50 overflow-hidden"
          >
            {projects.map(project => {
              const isConfirmingThis = deleteConfirmId === project.id;
              return (
                <div
                  key={project.id}
                  className={`group flex items-center gap-2 px-3 py-2 cursor-pointer transition-colors rounded-lg ${
                    project.id === currentProject?.id
                      ? 'bg-[var(--app-accent-soft)]'
                      : 'hover:bg-[var(--app-surface-muted)]'
                  }`}
                  onClick={() => {
                    if (deleteConfirmId !== project.id) {
                      handleSwitch(project.id);
                    }
                  }}
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
                    <div 
                      className={`${
                        isConfirmingThis ? 'flex' : 'hidden group-hover:flex'
                      } items-center gap-1.5`}
                      onClick={e => e.stopPropagation()}
                    >
                      {isConfirmingThis ? (
                        <motion.div 
                          className="flex items-center gap-1"
                          initial={{ opacity: 0, scale: 0.9 }}
                          animate={{ opacity: 1, scale: 1 }}
                          transition={{ duration: 0.14 }}
                        >
                          <button
                            onClick={(e) => { e.stopPropagation(); confirmDelete(); }}
                            className="p-1 rounded-md text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/20 transition-colors"
                            title="确认删除"
                          >
                            <Check size={12} strokeWidth={2.5} />
                          </button>
                          <button
                            onClick={(e) => { e.stopPropagation(); setDeleteConfirmId(null); }}
                            className="p-1 rounded-md text-zinc-500 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                            title="取消"
                          >
                            <X size={12} strokeWidth={2.5} />
                          </button>
                        </motion.div>
                      ) : (
                        <>
                          <button
                            onClick={e => { e.stopPropagation(); handleRename(project); }}
                            className="p-1 rounded hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-500 dark:text-zinc-400"
                            title="重命名"
                          >
                            <Pencil size={12} />
                          </button>
                          <button
                            onClick={e => { e.stopPropagation(); setDeleteConfirmId(project.id); }}
                            className="p-1 rounded hover:bg-red-100 dark:hover:bg-red-900/30 text-zinc-500 hover:text-red-600 dark:hover:text-red-400"
                            title="删除"
                          >
                            <Trash2 size={12} />
                          </button>
                        </>
                      )}
                    </div>
                  )}
                </div>
              );
            })}

            <div className="border-t border-[var(--app-border)] mt-1 pt-1">
              <button
                onClick={() => { onCreate(); setIsOpen(false); }}
                className="app-control flex items-center gap-2 w-full px-3 py-2 text-sm transition-colors rounded-lg"
              >
                <Plus size={14} />
                <span>新建简历</span>
              </button>
            </div>
          </motion.div>
        )}
       </AnimatePresence>


    </div>
  );
});
