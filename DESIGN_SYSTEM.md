# Hexo CMS - 设计系统规范

## 设计理念

**年轻活力 · 现代简洁 · 双主题支持**

参考大厂成熟设计体系（Vercel、Linear、Notion），打造年轻化、现代化的博客管理平台。

---

## 配色方案

### Light Mode（浅色主题）

```css
/* 主色调 - 淡橙色系 */
--primary-50: #FFF7ED;    /* 最浅背景 */
--primary-100: #FFEDD5;   /* 浅背景 */
--primary-200: #FED7AA;   /* 边框/分割线 */
--primary-300: #FDBA74;   /* 次要元素 */
--primary-400: #FB923C;   /* 悬停状态 */
--primary-500: #F97316;   /* 主按钮/强调色 */
--primary-600: #EA580C;   /* 按钮按下 */
--primary-700: #C2410C;   /* 深色强调 */

/* 辅助色 - 淡绿色系 */
--accent-50: #F0FDF4;     /* 最浅背景 */
--accent-100: #DCFCE7;    /* 浅背景 */
--accent-200: #BBF7D0;    /* 边框 */
--accent-300: #86EFAC;    /* 次要元素 */
--accent-400: #4ADE80;    /* 悬停状态 */
--accent-500: #22C55E;    /* 成功/确认 */
--accent-600: #16A34A;    /* 深色成功 */

/* 中性色 */
--gray-50: #F9FAFB;       /* 页面背景 */
--gray-100: #F3F4F6;      /* 卡片背景 */
--gray-200: #E5E7EB;      /* 边框 */
--gray-300: #D1D5DB;      /* 分割线 */
--gray-400: #9CA3AF;      /* 占位符 */
--gray-500: #6B7280;      /* 次要文字 */
--gray-600: #4B5563;      /* 正文 */
--gray-700: #374151;      /* 标题 */
--gray-800: #1F2937;      /* 深色标题 */
--gray-900: #111827;      /* 最深文字 */

/* 功能色 */
--success: #22C55E;       /* 成功 */
--warning: #F59E0B;       /* 警告 */
--error: #EF4444;         /* 错误 */
--info: #3B82F6;          /* 信息 */

/* 背景与文字 */
--bg-primary: #FFFFFF;    /* 主背景 */
--bg-secondary: #F9FAFB;  /* 次要背景 */
--bg-tertiary: #F3F4F6;   /* 三级背景 */
--text-primary: #111827;  /* 主文字 */
--text-secondary: #6B7280;/* 次要文字 */
--text-tertiary: #9CA3AF; /* 三级文字 */
```

### Dark Mode（深色主题）

```css
/* 主色调 - 淡橙色系（深色模式调整） */
--primary-50: #431407;    /* 最深背景 */
--primary-100: #7C2D12;   /* 深背景 */
--primary-200: #9A3412;   /* 边框 */
--primary-300: #C2410C;   /* 次要元素 */
--primary-400: #EA580C;   /* 悬停状态 */
--primary-500: #F97316;   /* 主按钮/强调色 */
--primary-600: #FB923C;   /* 按钮按下 */
--primary-700: #FDBA74;   /* 浅色强调 */

/* 辅助色 - 淡绿色系（深色模式调整） */
--accent-50: #052E16;     /* 最深背景 */
--accent-100: #14532D;    /* 深背景 */
--accent-200: #166534;    /* 边框 */
--accent-300: #16A34A;    /* 次要元素 */
--accent-400: #22C55E;    /* 悬停状态 */
--accent-500: #4ADE80;    /* 成功/确认 */
--accent-600: #86EFAC;    /* 浅色成功 */

/* 中性色 */
--gray-50: #030712;       /* 页面背景 */
--gray-100: #111827;      /* 卡片背景 */
--gray-200: #1F2937;      /* 边框 */
--gray-300: #374151;      /* 分割线 */
--gray-400: #4B5563;      /* 占位符 */
--gray-500: #6B7280;      /* 次要文字 */
--gray-600: #9CA3AF;      /* 正文 */
--gray-700: #D1D5DB;      /* 标题 */
--gray-800: #E5E7EB;      /* 深色标题 */
--gray-900: #F9FAFB;      /* 最浅文字 */

/* 功能色（深色模式） */
--success: #4ADE80;
--warning: #FBBF24;
--error: #F87171;
--info: #60A5FA;

/* 背景与文字 */
--bg-primary: #030712;    /* 主背景 */
--bg-secondary: #111827;  /* 次要背景 */
--bg-tertiary: #1F2937;   /* 三级背景 */
--text-primary: #F9FAFB;  /* 主文字 */
--text-secondary: #9CA3AF;/* 次要文字 */
--text-tertiary: #6B7280; /* 三级文字 */
```

---

## 字体系统

### 字体家族

```css
/* 界面字体 - 现代友好 */
--font-sans: 'Plus Jakarta Sans', 'Inter', -apple-system, BlinkMacSystemFont, 
             'Segoe UI', 'Noto Sans SC', sans-serif;

/* 代码字体 - 编辑器专用 */
--font-mono: 'JetBrains Mono', 'Fira Code', 'Consolas', 'Monaco', monospace;

/* 数字字体 - 统计数据 */
--font-numeric: 'Inter', tabular-nums, sans-serif;
```

### 字体大小

```css
--text-xs: 0.75rem;      /* 12px - 辅助信息 */
--text-sm: 0.875rem;     /* 14px - 次要文字 */
--text-base: 1rem;       /* 16px - 正文 */
--text-lg: 1.125rem;     /* 18px - 小标题 */
--text-xl: 1.25rem;      /* 20px - 卡片标题 */
--text-2xl: 1.5rem;      /* 24px - 页面标题 */
--text-3xl: 1.875rem;    /* 30px - 大标题 */
--text-4xl: 2.25rem;     /* 36px - 特大标题 */
```

### 字重

```css
--font-light: 300;
--font-normal: 400;
--font-medium: 500;
--font-semibold: 600;
--font-bold: 700;
```

### 行高

```css
--leading-tight: 1.25;   /* 标题 */
--leading-snug: 1.375;   /* 副标题 */
--leading-normal: 1.5;   /* 正文 */
--leading-relaxed: 1.625;/* 长文本 */
--leading-loose: 2;      /* 特殊场景 */
```

---

## 间距系统

采用 4px 基准网格系统：

```css
--spacing-0: 0;
--spacing-1: 0.25rem;    /* 4px */
--spacing-2: 0.5rem;     /* 8px */
--spacing-3: 0.75rem;    /* 12px */
--spacing-4: 1rem;       /* 16px */
--spacing-5: 1.25rem;    /* 20px */
--spacing-6: 1.5rem;     /* 24px */
--spacing-8: 2rem;       /* 32px */
--spacing-10: 2.5rem;    /* 40px */
--spacing-12: 3rem;      /* 48px */
--spacing-16: 4rem;      /* 64px */
--spacing-20: 5rem;      /* 80px */
```

---

## 圆角系统

```css
--radius-sm: 0.375rem;   /* 6px - 小按钮 */
--radius-md: 0.5rem;     /* 8px - 按钮/输入框 */
--radius-lg: 0.75rem;    /* 12px - 卡片 */
--radius-xl: 1rem;       /* 16px - 大卡片 */
--radius-2xl: 1.5rem;    /* 24px - 模态框 */
--radius-full: 9999px;   /* 圆形 */
```

---

## 阴影系统

### Light Mode

```css
--shadow-xs: 0 1px 2px 0 rgb(0 0 0 / 0.05);
--shadow-sm: 0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1);
--shadow-md: 0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1);
--shadow-lg: 0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1);
--shadow-xl: 0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1);
```

### Dark Mode

```css
--shadow-xs: 0 1px 2px 0 rgb(0 0 0 / 0.3);
--shadow-sm: 0 1px 3px 0 rgb(0 0 0 / 0.4), 0 1px 2px -1px rgb(0 0 0 / 0.4);
--shadow-md: 0 4px 6px -1px rgb(0 0 0 / 0.5), 0 2px 4px -2px rgb(0 0 0 / 0.5);
--shadow-lg: 0 10px 15px -3px rgb(0 0 0 / 0.6), 0 4px 6px -4px rgb(0 0 0 / 0.6);
--shadow-xl: 0 20px 25px -5px rgb(0 0 0 / 0.7), 0 8px 10px -6px rgb(0 0 0 / 0.7);
```

---

## 动画系统

### 过渡时长

```css
--duration-fast: 150ms;    /* 快速交互 */
--duration-base: 200ms;    /* 标准交互 */
--duration-slow: 300ms;    /* 慢速交互 */
--duration-slower: 500ms;  /* 页面切换 */
```

### 缓动函数

```css
--ease-in: cubic-bezier(0.4, 0, 1, 1);
--ease-out: cubic-bezier(0, 0, 0.2, 1);
--ease-in-out: cubic-bezier(0.4, 0, 0.2, 1);
--ease-spring: cubic-bezier(0.34, 1.56, 0.64, 1);
```

---

## 组件规范

### 按钮

**主按钮（Primary）**
- 背景：`--primary-500`
- 文字：白色
- 悬停：`--primary-600`
- 按下：`--primary-700`
- 圆角：`--radius-md`
- 高度：40px（默认）
- 内边距：16px 24px

**次要按钮（Secondary）**
- 背景：透明
- 边框：`--gray-300` (light) / `--gray-600` (dark)
- 文字：`--text-primary`
- 悬停：`--gray-100` (light) / `--gray-800` (dark)

**成功按钮（Success）**
- 背景：`--accent-500`
- 文字：白色
- 悬停：`--accent-600`

### 输入框

- 背景：`--bg-primary`
- 边框：`--gray-300` (light) / `--gray-600` (dark)
- 聚焦边框：`--primary-500`
- 圆角：`--radius-md`
- 高度：40px
- 内边距：12px 16px

### 卡片

- 背景：`--bg-primary`
- 边框：`--gray-200` (light) / `--gray-700` (dark)
- 圆角：`--radius-lg`
- 阴影：`--shadow-sm`
- 悬停阴影：`--shadow-md`
- 内边距：24px

### 侧边栏

- 宽度：240px（桌面）/ 全屏（移动）
- 背景：`--bg-secondary`
- 边框：`--gray-200` (light) / `--gray-700` (dark)

### 导航项

- 高度：40px
- 圆角：`--radius-md`
- 激活背景：`--primary-100` (light) / `--primary-900` (dark)
- 激活文字：`--primary-600` (light) / `--primary-400` (dark)
- 悬停背景：`--gray-100` (light) / `--gray-800` (dark)

---

## 图标系统

使用 **Lucide React** 图标库

- 默认尺寸：20px
- 小尺寸：16px
- 大尺寸：24px
- 颜色：继承父元素文字颜色

---

## 响应式断点

```css
--breakpoint-sm: 640px;   /* 手机 */
--breakpoint-md: 768px;   /* 平板 */
--breakpoint-lg: 1024px;  /* 笔记本 */
--breakpoint-xl: 1280px;  /* 桌面 */
--breakpoint-2xl: 1536px; /* 大屏 */
```

---

## 无障碍规范

1. **颜色对比度**：所有文字与背景对比度 ≥ 4.5:1
2. **焦点状态**：所有可交互元素必须有清晰的焦点环
3. **键盘导航**：支持 Tab / Shift+Tab / Enter / Escape
4. **屏幕阅读器**：所有图标按钮必须有 aria-label
5. **动画**：尊重 `prefers-reduced-motion`

---

## 参考设计

- **Vercel Dashboard** - 简洁现代的 SaaS 界面
- **Linear** - 流畅的交互动画
- **Notion** - 优雅的内容编辑体验
- **GitHub** - 成熟的代码管理界面
- **Raycast** - 精致的命令面板设计

---

## Tailwind CSS 配置

```js
// tailwind.config.js
export default {
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#FFF7ED',
          100: '#FFEDD5',
          200: '#FED7AA',
          300: '#FDBA74',
          400: '#FB923C',
          500: '#F97316',
          600: '#EA580C',
          700: '#C2410C',
        },
        accent: {
          50: '#F0FDF4',
          100: '#DCFCE7',
          200: '#BBF7D0',
          300: '#86EFAC',
          400: '#4ADE80',
          500: '#22C55E',
          600: '#16A34A',
        },
      },
      fontFamily: {
        sans: ['Plus Jakarta Sans', 'Inter', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
    },
  },
}
```
