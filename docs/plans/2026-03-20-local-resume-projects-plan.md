# 本地多简历项目系统实施计划

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement this plan task-by-task.

**Goal:** 实现本地浏览器多简历记忆系统，支持多份简历的创建、切换、重命名、删除，自动保存到 localStorage。

**Architecture:** 
- 新增 `useResumeProjects` hook 管理简历项目状态
- 新增 `ProjectSelector` 组件用于下拉选择切换
- 改造 `App.tsx` 集成多项目状态
- 统一使用 localStorage 持久化

**Tech Stack:** React 19, localStorage, TypeScript, Framer Motion

---

## 任务清单

### Task 1: 定义类型和常量

**Files:**
- Create: `src/types/resumeProject.ts`

**Step 1: 创建类型定义文件**

```typescript
import type { ResumeDraft } from './resume';
import type { ResumeThemeConfig } from './theme';
import type { ResumeTemplate } from '@/config/ui';

export interface ResumeProject {
  id: string;
  name: string;
  data: ResumeDraft;
  theme: ResumeThemeConfig;
  layout: LayoutConfig;
  templateId: ResumeTemplate;
  createdAt: number;
  updatedAt: number;
}

export interface LayoutConfig {
  // 扩展预留，目前为空
}

export interface StorageSchema {
  projects: ResumeProject[];
  currentProjectId: string | null;
}

export const STORAGE_KEY = 'resume_projects';

export function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}
```

**Step 2: 验证文件创建成功**

---

### Task 2: 创建 useResumeProjects Hook

**Files:**
- Create: `src/hooks/useResumeProjects.ts`

**Step 1: 创建 Hook 实现**

```typescript
import { useState, useEffect, useCallback, useRef } from 'react';
import type { ResumeProject, StorageSchema } from '@/types/resumeProject';
import { STORAGE_KEY, generateId, DEFAULT_THEME_CONFIG } from '@/types/resumeProject';
import { parseMarkdownToResumeDraft } from '@/utils/resumeDocument';
import { defaultMarkdownZh } from '@/constants';
import type { ResumeDraft } from '@/types/resume';
import type { ResumeTemplate } from '@/config/ui';

const DEFAULT_DRAFT: ResumeDraft = parseMarkdownToResumeDraft(defaultMarkdownZh);

function getDefaultProject(): ResumeProject {
  return {
    id: generateId(),
    name: '我的简历1',
    data: { ...DEFAULT_DRAFT },
    theme: { ...DEFAULT_THEME_CONFIG },
    layout: {},
    templateId: 'classic',
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
}

function loadFromStorage(): StorageSchema {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      const defaultProject = getDefaultProject();
      return { projects: [defaultProject], currentProjectId: defaultProject.id };
    }
    const parsed = JSON.parse(raw) as StorageSchema;
    if (!parsed.projects?.length) {
      const defaultProject = getDefaultProject();
      return { projects: [defaultProject], currentProjectId: defaultProject.id };
    }
    return parsed;
  } catch {
    const defaultProject = getDefaultProject();
    return { projects: [defaultProject], currentProjectId: defaultProject.id };
  }
}

function saveToStorage(data: StorageSchema): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch (e) {
    console.error('Failed to save to localStorage:', e);
  }
}

export function useResumeProjects() {
  const [storageData, setStorageData] = useState<StorageSchema>(() => loadFromStorage());
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // 防抖保存
  useEffect(() => {
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }
    saveTimeoutRef.current = setTimeout(() => {
      saveToStorage(storageData);
    }, 1000);
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [storageData]);

  // 立即保存关键操作
  const immediateSave = useCallback((data: StorageSchema) => {
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }
    saveToStorage(data);
  }, []);

  const currentProject = storageData.projects.find(
    p => p.id === storageData.currentProjectId
  ) ?? storageData.projects[0];

  const createProject = useCallback((copyFrom?: string) => {
    const existingNames = storageData.projects
      .map(p => p.name)
      .filter(name => /^我的简历\d+$/.test(name));
    
    let nextNum = 1;
    if (existingNames.length > 0) {
      const nums = existingNames
        .map(name => parseInt(name.replace('我的简历', ''), 10))
        .filter(n => !isNaN(n));
      nextNum = nums.length > 0 ? Math.max(...nums) + 1 : 1;
    }
    const newName = `我的简历${nextNum}`;

    let newData: ResumeDraft = { ...DEFAULT_DRAFT };
    if (copyFrom) {
      const source = storageData.projects.find(p => p.id === copyFrom);
      if (source) {
        newData = { ...source.data };
      }
    }

    const newProject: ResumeProject = {
      id: generateId(),
      name: newName,
      data: newData,
      theme: { ...DEFAULT_THEME_CONFIG },
      layout: {},
      templateId: 'classic',
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    const newData: StorageSchema = {
      projects: [...storageData.projects, newProject],
      currentProjectId: newProject.id,
    };
    immediateSave(newData);
    setStorageData(newData);
    return newProject;
  }, [storageData, immediateSave]);

  const switchProject = useCallback((id: string) => {
    // 先保存当前项目
    const newData: StorageSchema = {
      ...storageData,
      currentProjectId: id,
    };
    immediateSave(newData);
    setStorageData(newData);
  }, [storageData, immediateSave]);

  const updateProject = useCallback((id: string, updates: Partial<Omit<ResumeProject, 'id' | 'createdAt'>>) => {
    setStorageData(prev => {
      const newProjects = prev.projects.map(p =>
        p.id === id
          ? { ...p, ...updates, updatedAt: Date.now() }
          : p
      );
      return { ...prev, projects: newProjects };
    });
  }, []);

  const deleteProject = useCallback((id: string) => {
    if (storageData.projects.length <= 1) {
      return; // 至少保留一个
    }
    const newProjects = storageData.projects.filter(p => p.id !== id);
    const newCurrentId = storageData.currentProjectId === id
      ? newProjects[0]?.id ?? null
      : storageData.currentProjectId;
    
    const newData: StorageSchema = {
      projects: newProjects,
      currentProjectId: newCurrentId,
    };
    immediateSave(newData);
    setStorageData(newData);
  }, [storageData, immediateSave]);

  const renameProject = useCallback((id: string, newName: string) => {
    updateProject(id, { name: newName });
  }, [updateProject]);

  return {
    projects: storageData.projects,
    currentProject,
    createProject,
    switchProject,
    updateProject,
    deleteProject,
    renameProject,
  };
}
```

**Step 2: 检查 TypeScript 类型错误**

---

### Task 3: 创建 ProjectSelector 组件

**Files:**
- Create: `src/components/ProjectSelector.tsx`

**Step 1: 创建组件**

```tsx
import { useState, useRef, useEffect, memo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, Plus, Pencil, Trash2 } from 'lucide-react';
import type { ResumeProject } from '@/types/resumeProject';

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
  const dropdownRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

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

  const handleDelete = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (projects.length > 1 && confirm('确定要删除这份简历吗？')) {
      onDelete(id);
    }
  };

  const handleSwitch = (id: string) => {
    onSwitch(id);
    setIsOpen(false);
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <motion.button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 text-sm transition-colors"
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
      >
        <span className="font-medium truncate max-w-[120px]">
          {currentProject?.name ?? '选择简历'}
        </span>
        <ChevronDown size={14} className={`transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </motion.button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.15 }}
            className="absolute top-full left-0 mt-1 w-56 bg-white dark:bg-zinc-900 rounded-lg shadow-lg border border-zinc-200 dark:border-zinc-700 py-1 z-50"
          >
            {projects.map(project => (
              <div
                key={project.id}
                className={`group flex items-center gap-2 px-3 py-2 cursor-pointer transition-colors ${
                  project.id === currentProject?.id
                    ? 'bg-zinc-100 dark:bg-zinc-800'
                    : 'hover:bg-zinc-50 dark:hover:bg-zinc-800/50'
                }`}
                onClick={() => handleSwitch(project.id)}
              >
                <span className={`flex-1 truncate text-sm ${
                  project.id === currentProject?.id
                    ? 'font-medium text-zinc-900 dark:text-zinc-100'
                    : 'text-zinc-700 dark:text-zinc-300'
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
                      onClick={e => handleDelete(project.id, e)}
                      className="p-1 rounded hover:bg-red-100 dark:hover:bg-red-900/30 text-zinc-500 hover:text-red-600 dark:hover:text-red-400"
                      title="删除"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                )}
              </div>
            ))}

            <div className="border-t border-zinc-200 dark:border-zinc-700 mt-1 pt-1">
              <button
                onClick={() => { onCreate(); setIsOpen(false); }}
                className="flex items-center gap-2 w-full px-3 py-2 text-sm text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors"
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
```

**Step 2: 检查 TypeScript 类型错误**

---

### Task 4: 集成到 App.tsx

**Files:**
- Modify: `src/App.tsx:1-50`
- Modify: `src/App.tsx:100-140`

**Step 1: 添加 import 和 hook 调用**

在 App.tsx 顶部添加：
```typescript
import { useResumeProjects } from './hooks/useResumeProjects';
```

在 `export default function App()` 函数内添加：
```typescript
const {
  projects,
  currentProject,
  createProject,
  switchProject,
  updateProject,
  renameProject,
  deleteProject,
} = useResumeProjects();
```

**Step 2: 用项目数据替换原有状态**

替换：
```typescript
// 删除原有状态
// const [markdown, setMarkdown] = useState(defaultMarkdownZh);
// const [draft, setDraft] = useState(() => parseMarkdownToResumeDraft(defaultMarkdownZh));
// const [template, setTemplate] = useState<ResumeTemplate>('classic');
// const { theme: resumeTheme, updateTheme, resetTheme, updateCustomCss } = useResumeTheme();

// 使用项目状态
const [markdown, setMarkdown] = useState(currentProject?.data 
  ? serializeResumeDraftToMarkdown(currentProject.data)
  : defaultMarkdownZh
);
const [draft, setDraft] = useState<ResumeDraft>(currentProject?.data ?? parseMarkdownToResumeDraft(defaultMarkdownZh));
const [template, setTemplate] = useState<ResumeTemplate>(currentProject?.templateId ?? 'classic');
const [resumeTheme, setResumeTheme] = useState(currentProject?.theme ?? DEFAULT_THEME_CONFIG);
```

**Step 3: 添加状态变化时的数据同步**

```typescript
// 监听项目切换，同步更新状态
useEffect(() => {
  if (currentProject) {
    setMarkdown(serializeResumeDraftToMarkdown(currentProject.data));
    setDraft(currentProject.data);
    setTemplate(currentProject.templateId);
    setResumeTheme(currentProject.theme);
  }
}, [currentProject?.id]);

// 简历内容变化时自动保存
useEffect(() => {
  if (currentProject) {
    const parsed = parseMarkdownToResumeDraft(markdown);
    updateProject(currentProject.id, { data: parsed });
  }
}, [markdown]);

// 草稿变化时自动保存
useEffect(() => {
  if (currentProject) {
    updateProject(currentProject.id, { data: draft });
  }
}, [draft]);

// 模板变化时自动保存
useEffect(() => {
  if (currentProject) {
    updateProject(currentProject.id, { templateId: template });
  }
}, [template]);

// 主题变化时自动保存
useEffect(() => {
  if (currentProject) {
    updateProject(currentProject.id, { theme: resumeTheme });
  }
}, [resumeTheme]);
```

**Step 4: 添加主题管理的回调**

替换原来的 `useResumeTheme` hook 调用：
```typescript
// 删除
// const { theme: resumeTheme, updateTheme, resetTheme, updateCustomCss } = useResumeTheme();

// 替换为
const updateTheme = useCallback((newConfig: Partial<ResumeThemeConfig>) => {
  setResumeTheme(prev => ({ ...prev, ...newConfig }));
}, []);

const resetTheme = useCallback(() => {
  setResumeTheme(DEFAULT_THEME_CONFIG);
}, []);

const updateCustomCss = useCallback((css: string) => {
  setResumeTheme(prev => ({ ...prev, customCss: css }));
}, []);
```

**Step 5: 验证文件无语法错误**

---

### Task 5: 集成 ProjectSelector 到 AppHeader

**Files:**
- Modify: `src/components/AppHeader.tsx:1-30`
- Modify: `src/components/AppHeader.tsx:110-140`

**Step 1: 添加 ProjectSelector import**

```typescript
import { ProjectSelector } from './ProjectSelector';
```

**Step 2: 添加 props 到 AppHeader**

```typescript
interface AppHeaderProps {
  // ... 现有 props
  
  // 新增
  projects: ResumeProject[];
  currentProject: ResumeProject | undefined;
  onProjectSwitch: (id: string) => void;
  onProjectCreate: () => void;
  onProjectRename: (id: string, newName: string) => void;
  onProjectDelete: (id: string) => void;
}
```

**Step 3: 在 header 左侧添加 ProjectSelector**

在 `<div className="hidden sm:flex items-center gap-2 mr-2">` 这行之前添加：
```tsx
<ProjectSelector
  projects={projects}
  currentProject={currentProject}
  onSwitch={onProjectSwitch}
  onCreate={onProjectCreate}
  onRename={onProjectRename}
  onDelete={onProjectDelete}
/>
```

**Step 4: 更新 AppHeader 解构**

在 `export const AppHeader` 组件参数解构中添加新 props。

**Step 5: 验证文件无语法错误**

---

### Task 6: 完整集成 App.tsx 和 AppHeader

**Files:**
- Modify: `src/App.tsx:116-140`

**Step 1: 传递 ProjectSelector 相关 props 到 AppHeader**

```tsx
<AppHeader
  // ... 现有 props
  projects={projects}
  currentProject={currentProject}
  onProjectSwitch={switchProject}
  onProjectCreate={createProject}
  onProjectRename={renameProject}
  onProjectDelete={deleteProject}
/>
```

**Step 2: 验证完整编译**

---

### Task 7: 添加默认主题常量导出

**Files:**
- Modify: `src/types/theme.ts`

**Step 1: 导出默认主题常量**

确保 `DEFAULT_THEME_CONFIG` 已导出（在 Task 2 中已引用）。

---

### Task 8: 测试完整流程

**Step 1: 启动开发服务器**

```bash
pnpm dev
```

**Step 2: 验证功能**
- [ ] 页面加载显示默认简历"我的简历1"
- [ ] 下拉选择器可以打开，显示简历列表
- [ ] 点击切换简历，数据正确切换
- [ ] 新建简历，默认命名为"我的简历2"
- [ ] 重命名功能正常
- [ ] 删除功能正常（至少保留一份）
- [ ] 编辑内容后自动保存
- [ ] 刷新页面数据保留

---

## 实施顺序

1. Task 1: 类型定义
2. Task 2: useResumeProjects Hook
3. Task 3: ProjectSelector 组件
4. Task 7: 确保常量导出
5. Task 4: 集成到 App.tsx
6. Task 5: 集成到 AppHeader
7. Task 6: 完整集成
8. Task 8: 测试验证
