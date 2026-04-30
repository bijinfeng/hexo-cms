import { createFileRoute } from "@tanstack/react-router";
import { Card, CardContent } from "#/components/ui/card";
import { Badge } from "#/components/ui/badge";
import { Button } from "#/components/ui/button";
import {
  Plus,
  Edit3,
  Trash2,
  Eye,
  Globe,
  FileText,
} from "lucide-react";

export const Route = createFileRoute("/pages")({
  component: PagesPage,
});

const pages = [
  {
    id: "1",
    title: "关于我",
    path: "/about",
    template: "page",
    status: "published",
    updatedAt: "2026-04-20",
    description: "个人介绍页面",
  },
  {
    id: "2",
    title: "友情链接",
    path: "/links",
    template: "links",
    status: "published",
    updatedAt: "2026-04-15",
    description: "友情链接收录页面",
  },
  {
    id: "3",
    title: "归档",
    path: "/archives",
    template: "archive",
    status: "published",
    updatedAt: "2026-04-28",
    description: "文章归档页面（自动生成）",
  },
  {
    id: "4",
    title: "标签云",
    path: "/tags",
    template: "tags",
    status: "published",
    updatedAt: "2026-04-28",
    description: "标签云页面（自动生成）",
  },
  {
    id: "5",
    title: "作品集",
    path: "/portfolio",
    template: "page",
    status: "draft",
    updatedAt: "2026-04-10",
    description: "个人作品展示页面",
  },
];

const statusConfig = {
  published: { label: "已发布", variant: "success" as const },
  draft: { label: "草稿", variant: "default" as const },
};

function PagesPage() {
  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[var(--text-primary)]">页面管理</h1>
          <p className="text-sm text-[var(--text-secondary)] mt-0.5">
            管理博客的独立页面
          </p>
        </div>
        <Button>
          <Plus size={16} />
          新建页面
        </Button>
      </div>

      {/* Pages List */}
      <div className="space-y-3">
        {pages.map((page) => {
          const status = statusConfig[page.status as keyof typeof statusConfig];
          return (
            <Card
              key={page.id}
              className="hover:shadow-[var(--shadow-sm)] transition-shadow group"
            >
              <CardContent className="p-4">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-lg bg-[var(--brand-primary-subtle)] flex items-center justify-center flex-shrink-0">
                    <FileText size={18} className="text-[var(--brand-primary)]" />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="text-sm font-semibold text-[var(--text-primary)]">
                        {page.title}
                      </span>
                      <Badge variant={status.variant}>{status.label}</Badge>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-[var(--text-tertiary)]">
                      <span className="flex items-center gap-1 font-mono">
                        <Globe size={10} />
                        {page.path}
                      </span>
                      <span>{page.description}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button className="w-7 h-7 rounded-md flex items-center justify-center text-[var(--text-tertiary)] hover:text-[var(--brand-primary)] hover:bg-[var(--brand-primary-subtle)] transition-colors cursor-pointer">
                      <Edit3 size={14} />
                    </button>
                    <button className="w-7 h-7 rounded-md flex items-center justify-center text-[var(--text-tertiary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-muted)] transition-colors cursor-pointer">
                      <Eye size={14} />
                    </button>
                    <button className="w-7 h-7 rounded-md flex items-center justify-center text-[var(--text-tertiary)] hover:text-[var(--status-error)] hover:bg-[var(--status-error-bg)] transition-colors cursor-pointer">
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}

        {/* Add new page */}
        <button className="w-full flex items-center justify-center gap-2 p-4 rounded-xl border-2 border-dashed border-[var(--border-default)] text-[var(--text-tertiary)] hover:border-[var(--brand-primary)] hover:text-[var(--brand-primary)] hover:bg-[var(--brand-primary-subtle)] transition-all cursor-pointer">
          <Plus size={16} />
          <span className="text-sm font-medium">新建页面</span>
        </button>
      </div>
    </div>
  );
}
