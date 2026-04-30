import { useState } from "react";
import { Card, CardContent } from "../components/ui/card";
import { Badge } from "../components/ui/badge";
import { Button } from "../components/ui/button";
import {
  Tag,
  FolderOpen,
  Plus,
  Search,
  Edit3,
  Trash2,
  Hash,
  ChevronRight,
} from "lucide-react";

const tags = [
  { id: "1", name: "React", slug: "react", count: 12, color: "#61DAFB" },
  { id: "2", name: "TypeScript", slug: "typescript", count: 9, color: "#3178C6" },
  { id: "3", name: "TanStack", slug: "tanstack", count: 5, color: "#FF4154" },
  { id: "4", name: "CSS", slug: "css", count: 8, color: "#1572B6" },
  { id: "5", name: "Tailwind", slug: "tailwind", count: 7, color: "#06B6D4" },
  { id: "6", name: "Auth", slug: "auth", count: 3, color: "#10B981" },
  { id: "7", name: "DevOps", slug: "devops", count: 4, color: "#F59E0B" },
  { id: "8", name: "GitHub", slug: "github", count: 6, color: "#6B7280" },
  { id: "9", name: "架构", slug: "architecture", count: 5, color: "#8B5CF6" },
  { id: "10", name: "安全", slug: "security", count: 2, color: "#EF4444" },
  { id: "11", name: "CMS", slug: "cms", count: 3, color: "#F97316" },
  { id: "12", name: "运维", slug: "ops", count: 4, color: "#84CC16" },
];

const categories = [
  { id: "1", name: "前端开发", slug: "frontend", count: 18, children: ["React", "CSS", "TypeScript"] },
  { id: "2", name: "后端开发", slug: "backend", count: 7, children: ["Auth", "安全"] },
  { id: "3", name: "系统设计", slug: "system-design", count: 5, children: ["架构", "CMS"] },
  { id: "4", name: "运维", slug: "ops", count: 8, children: ["DevOps", "GitHub", "运维"] },
];

export function TagsPage() {
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState<"tags" | "categories">("tags");

  const filteredTags = tags.filter((t) =>
    !search || t.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[var(--text-primary)]">标签 & 分类</h1>
          <p className="text-sm text-[var(--text-secondary)] mt-0.5">
            {tags.length} 个标签，{categories.length} 个分类
          </p>
        </div>
        <Button>
          <Plus size={16} />
          {activeTab === "tags" ? "新建标签" : "新建分类"}
        </Button>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 p-1 rounded-lg bg-[var(--bg-muted)] border border-[var(--border-default)] w-fit">
        <button
          onClick={() => setActiveTab("tags")}
          className={`flex items-center gap-2 px-4 py-1.5 rounded-md text-sm font-medium transition-all cursor-pointer ${
            activeTab === "tags"
              ? "bg-[var(--bg-surface)] text-[var(--text-primary)] shadow-sm"
              : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
          }`}
        >
          <Tag size={14} />
          标签
          <span className="text-xs text-[var(--text-tertiary)]">{tags.length}</span>
        </button>
        <button
          onClick={() => setActiveTab("categories")}
          className={`flex items-center gap-2 px-4 py-1.5 rounded-md text-sm font-medium transition-all cursor-pointer ${
            activeTab === "categories"
              ? "bg-[var(--bg-surface)] text-[var(--text-primary)] shadow-sm"
              : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
          }`}
        >
          <FolderOpen size={14} />
          分类
          <span className="text-xs text-[var(--text-tertiary)]">{categories.length}</span>
        </button>
      </div>

      {/* Search */}
      <div className="flex items-center gap-2 h-9 px-3 rounded-lg bg-[var(--bg-surface)] border border-[var(--border-default)] focus-within:border-[var(--brand-primary)] transition-colors max-w-sm">
        <Search size={14} className="text-[var(--text-tertiary)] flex-shrink-0" />
        <input
          type="text"
          placeholder={activeTab === "tags" ? "搜索标签..." : "搜索分类..."}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1 bg-transparent text-sm text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] outline-none"
        />
      </div>

      {activeTab === "tags" ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
          {filteredTags.map((tag) => (
            <div
              key={tag.id}
              className="group flex items-center gap-3 p-4 rounded-xl bg-[var(--bg-surface)] border border-[var(--border-default)] hover:border-[var(--border-strong)] hover:shadow-[var(--shadow-sm)] transition-all cursor-pointer"
            >
              <div
                className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                style={{ backgroundColor: tag.color + "20" }}
              >
                <Hash size={14} style={{ color: tag.color }} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-[var(--text-primary)] truncate">{tag.name}</div>
                <div className="text-xs text-[var(--text-tertiary)]">{tag.count} 篇文章</div>
              </div>
              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button className="w-6 h-6 rounded flex items-center justify-center text-[var(--text-tertiary)] hover:text-[var(--brand-primary)] hover:bg-[var(--brand-primary-subtle)] transition-colors cursor-pointer">
                  <Edit3 size={12} />
                </button>
                <button className="w-6 h-6 rounded flex items-center justify-center text-[var(--text-tertiary)] hover:text-[var(--status-error)] hover:bg-[var(--status-error-bg)] transition-colors cursor-pointer">
                  <Trash2 size={12} />
                </button>
              </div>
            </div>
          ))}

          {/* Add new tag card */}
          <button className="flex items-center justify-center gap-2 p-4 rounded-xl border-2 border-dashed border-[var(--border-default)] text-[var(--text-tertiary)] hover:border-[var(--brand-primary)] hover:text-[var(--brand-primary)] hover:bg-[var(--brand-primary-subtle)] transition-all cursor-pointer">
            <Plus size={16} />
            <span className="text-sm font-medium">新建标签</span>
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {categories.map((cat) => (
            <Card key={cat.id} className="hover:shadow-[var(--shadow-sm)] transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-[var(--brand-accent-subtle)] flex items-center justify-center flex-shrink-0">
                    <FolderOpen size={16} className="text-[var(--brand-accent)]" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm font-semibold text-[var(--text-primary)]">{cat.name}</span>
                      <Badge variant="default">{cat.count} 篇</Badge>
                    </div>
                    <div className="flex items-center gap-1 flex-wrap">
                      {cat.children.map((child) => (
                        <span
                          key={child}
                          className="text-xs px-2 py-0.5 rounded-full bg-[var(--bg-muted)] text-[var(--text-secondary)]"
                        >
                          {child}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <button className="w-7 h-7 rounded-md flex items-center justify-center text-[var(--text-tertiary)] hover:text-[var(--brand-primary)] hover:bg-[var(--brand-primary-subtle)] transition-colors cursor-pointer">
                      <Edit3 size={14} />
                    </button>
                    <button className="w-7 h-7 rounded-md flex items-center justify-center text-[var(--text-tertiary)] hover:text-[var(--status-error)] hover:bg-[var(--status-error-bg)] transition-colors cursor-pointer">
                      <Trash2 size={14} />
                    </button>
                    <button className="w-7 h-7 rounded-md flex items-center justify-center text-[var(--text-tertiary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-muted)] transition-colors cursor-pointer">
                      <ChevronRight size={14} />
                    </button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}

          <button className="w-full flex items-center justify-center gap-2 p-4 rounded-xl border-2 border-dashed border-[var(--border-default)] text-[var(--text-tertiary)] hover:border-[var(--brand-accent)] hover:text-[var(--brand-accent)] hover:bg-[var(--brand-accent-subtle)] transition-all cursor-pointer">
            <Plus size={16} />
            <span className="text-sm font-medium">新建分类</span>
          </button>
        </div>
      )}
    </div>
  );
}
