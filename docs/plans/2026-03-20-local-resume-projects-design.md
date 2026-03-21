# 本地浏览器多简历记忆系统设计方案

**日期**: 2026-03-20  
**状态**: 已确认

---

## 1. 数据结构设计

```typescript
// 简历项目类型
interface ResumeProject {
  id: string;           // UUID，唯一标识
  name: string;          // 简历名称（用户自定义，如"技术简历"、"管理岗"）
  data: ResumeData;     // 简历完整数据
  theme: ThemeConfig;    // 主题配置
  layout: LayoutConfig;  // 布局设置
  templateId: string;    // 当前模板 ID
  createdAt: number;     // 创建时间戳
  updatedAt: number;     // 更新时间戳
}

// 存储结构
interface StorageSchema {
  projects: ResumeProject[];  // 简历列表
  currentProjectId: string | null;  // 当前激活的简历 ID
}
```

**localStorage Key**: `resume_projects`

---

## 2. 核心功能

| 功能 | 说明 |
|------|------|
| 新建简历 | 创建空白简历，默认名称"我的简历1"、"我的简历2"... |
| 切换简历 | 下拉选择器快速切换 |
| 重命名 | 编辑简历名称 |
| 删除 | 确认弹窗后删除 |
| 自动保存 | 内容变更后 1 秒防抖保存 |
| 默认简历 | 首个简历不可删除，保留兜底 |

---

## 3. UI 交互

```
┌─────────────────────────────────────────────┐
│ [📋 下拉选择器 ▼]  [新建 +]                  │
└─────────────────────────────────────────────┘
            ▼
    ┌───────────────────┐
    │ ▸ 我的简历1        │  ← 当前
    │   我的简历2         │
    │   技术简历         │
    ├───────────────────┤
    │   + 新建简历       │
    └───────────────────┘
```

- 下拉项悬停显示「重命名」和「删除」图标
- 新建按钮点击直接创建空白简历
- 切换时自动保存当前简历

---

## 4. 状态管理

- 使用 React Context 管理当前项目状态
- 提供 `useResumeProjects()` hook 封装
- 暴露方法：`createProject`, `switchProject`, `updateProject`, `deleteProject`

---

## 5. 边界处理

| 场景 | 处理方式 |
|------|----------|
| 首次访问 | 自动创建默认简历"我的简历1" |
| 数据损坏 | 捕获 JSON.parse 错误，恢复默认 |
| 空名称 | 强制要求名称，非空校验 |

---

## 6. 实现计划

详见: [实施计划](./2026-03-20-local-resume-projects-plan.md)
