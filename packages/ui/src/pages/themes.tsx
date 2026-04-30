import { useState } from "react";
import { Card, CardContent } from "../components/ui/card";
import { Badge } from "../components/ui/badge";
import { Button } from "../components/ui/button";
import {
  Palette,
  CheckCircle2,
  Download,
  Star,
  Eye,
} from "lucide-react";

const themes = [
  {
    id: "1",
    name: "Butterfly",
    version: "4.14.0",
    description: "一款美丽的 Hexo 主题，支持多种配色方案和丰富的功能",
    author: "jerryc127",
    stars: 8200,
    active: true,
    preview: "https://butterfly.js.org",
    tags: ["响应式", "暗色模式", "SEO"],
  },
  {
    id: "2",
    name: "Next",
    version: "8.20.0",
    description: "简洁优雅的 Hexo 主题，专注于内容展示",
    author: "theme-next",
    stars: 16500,
    active: false,
    preview: "https://theme-next.js.org",
    tags: ["简洁", "高性能", "多语言"],
  },
  {
    id: "3",
    name: "Fluid",
    version: "1.9.7",
    description: "Material Design 风格的 Hexo 主题",
    author: "fluid-dev",
    stars: 7100,
    active: false,
    preview: "https://hexo.fluid-dev.com",
    tags: ["Material", "动画", "评论"],
  },
  {
    id: "4",
    name: "Icarus",
    version: "5.1.0",
    description: "功能丰富的三栏布局 Hexo 主题",
    author: "ppoffice",
    stars: 5400,
    active: false,
    preview: "https://ppoffice.github.io/hexo-theme-icarus",
    tags: ["三栏", "插件丰富", "自定义"],
  },
];

export function ThemesPage() {
  const [activeTheme, setActiveTheme] = useState("1");

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[var(--text-primary)]">主题管理</h1>
          <p className="text-sm text-[var(--text-secondary)] mt-0.5">
            管理和切换 Hexo 主题
          </p>
        </div>
        <Button variant="outline">
          <Download size={16} />
          安装新主题
        </Button>
      </div>

      {/* Theme Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {themes.map((theme) => {
          const isActive = activeTheme === theme.id;
          return (
            <Card
              key={theme.id}
              className={`transition-all ${
                isActive ? "border-[var(--brand-primary)] shadow-[var(--shadow-md)]" : "hover:shadow-[var(--shadow-sm)]"
              }`}
            >
              <CardContent className="p-5">
                <div className="w-full h-32 rounded-lg bg-gradient-to-br from-[var(--bg-muted)] to-[var(--bg-subtle)] mb-4 flex items-center justify-center relative overflow-hidden">
                  <Palette size={32} className="text-[var(--text-tertiary)] opacity-30" />
                  {isActive && (
                    <div className="absolute top-2 right-2">
                      <Badge variant="success">当前使用</Badge>
                    </div>
                  )}
                </div>

                <div className="flex items-start justify-between mb-2">
                  <div>
                    <h3 className="text-base font-semibold text-[var(--text-primary)]">
                      {theme.name}
                    </h3>
                    <p className="text-xs text-[var(--text-tertiary)]">
                      v{theme.version} · by {theme.author}
                    </p>
                  </div>
                  <div className="flex items-center gap-1 text-xs text-[var(--text-tertiary)]">
                    <Star size={12} className="text-[var(--status-warning)]" />
                    {(theme.stars / 1000).toFixed(1)}k
                  </div>
                </div>

                <p className="text-sm text-[var(--text-secondary)] mb-3 leading-relaxed">
                  {theme.description}
                </p>

                <div className="flex items-center gap-1.5 flex-wrap mb-4">
                  {theme.tags.map((tag) => (
                    <span
                      key={tag}
                      className="text-xs px-2 py-0.5 rounded-full bg-[var(--bg-muted)] text-[var(--text-secondary)]"
                    >
                      {tag}
                    </span>
                  ))}
                </div>

                <div className="flex items-center gap-2">
                  {isActive ? (
                    <Button variant="success" size="sm" className="flex-1" disabled>
                      <CheckCircle2 size={14} />
                      已启用
                    </Button>
                  ) : (
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1"
                      onClick={() => setActiveTheme(theme.id)}
                    >
                      切换主题
                    </Button>
                  )}
                  <a
                    href={theme.preview}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-muted)] transition-colors cursor-pointer"
                  >
                    <Eye size={14} />
                    预览
                  </a>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
