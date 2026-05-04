import type { ReactNode } from "react";
import { useState, useMemo } from "react";
import { Search, Loader2, AlertCircle, Inbox } from "lucide-react";

interface ListPageProps<T> {
  title: string;
  description?: string;
  loading: boolean;
  error: string;
  items: T[];
  searchFields: (keyof T)[];
  searchPlaceholder?: string;
  renderSearch?: (query: string, setQuery: (q: string) => void) => ReactNode;
  onRetry?: () => void;
  headerExtra?: ReactNode;
  emptyMessage?: string;
  emptyIcon?: ReactNode;
  renderItem: (item: T, index: number) => ReactNode;
  renderFilters?: ReactNode;
}

export function ListPage<T>({
  title,
  description,
  loading,
  error,
  items,
  searchFields,
  searchPlaceholder = "搜索...",
  renderSearch,
  onRetry,
  headerExtra,
  emptyMessage = "暂无数据",
  emptyIcon,
  renderItem,
  renderFilters,
}: ListPageProps<T>) {
  const [searchQuery, setSearchQuery] = useState("");

  const filtered = useMemo(() => {
    if (!searchQuery.trim()) return items;
    const q = searchQuery.toLowerCase();
    return items.filter((item) =>
      searchFields.some((field) => {
        const val = item[field];
        return typeof val === "string" && val.toLowerCase().includes(q);
      })
    );
  }, [items, searchQuery, searchFields]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-6 h-6 animate-spin text-[var(--text-tertiary)]" />
      </div>
    );
  }

  if (error && items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-3">
        <AlertCircle className="w-10 h-10 text-[var(--status-error)]" />
        <p className="text-sm text-[var(--text-secondary)]">{error}</p>
        {onRetry && (
          <button
            onClick={onRetry}
            className="px-4 py-2 text-sm bg-primary-500 text-white rounded-md hover:bg-primary-600 transition-colors cursor-pointer"
          >
            重试
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[var(--text-primary)]">{title}</h1>
          {description && (
            <p className="text-sm text-[var(--text-secondary)] mt-0.5">{description}</p>
          )}
        </div>
        {headerExtra}
      </div>

      <div className="flex items-center gap-2">
        {renderSearch ? (
          renderSearch(searchQuery, setSearchQuery)
        ) : (
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-tertiary)]" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={searchPlaceholder}
              className="form-input w-full pl-9"
            />
          </div>
        )}
        {renderFilters}
      </div>

      {error && (
        <div className="p-3 rounded-lg bg-[var(--status-error-bg)] border border-[var(--status-error)] text-sm text-[var(--status-error)]">
          {error}
        </div>
      )}

      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center min-h-[300px] gap-2">
          {emptyIcon || <Inbox className="w-10 h-10 text-[var(--text-tertiary)]" />}
          <p className="text-sm text-[var(--text-tertiary)]">
            {searchQuery ? "没有匹配的结果" : emptyMessage}
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((item, i) => renderItem(item, i))}
        </div>
      )}
    </div>
  );
}
