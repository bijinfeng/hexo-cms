import { Search, Filter, ChevronDown, ChevronUp, X } from "lucide-react";
import { Button } from "../../components/ui/button";
import { Badge } from "../../components/ui/badge";
import { Card, CardContent } from "../../components/ui/card";
import { ToggleGroup, ToggleGroupItem } from "../../components/ui/toggle-group";
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "../../components/ui/select";
import { filterOptions, dateRangeOptions } from "./usePostsFilter";

interface PostFiltersProps {
  search: string;
  onSearchChange: (v: string) => void;
  activeFilter: string;
  onActiveFilterChange: (v: string) => void;
  showFilters: boolean;
  onToggleFilters: () => void;
  hasActiveFilters: boolean;
  selectedCategory: string;
  onSelectedCategoryChange: (v: string) => void;
  dateRange: string;
  onDateRangeChange: (v: string) => void;
  allCategories: string[];
  onClearAll: () => void;
  filteredCount: number;
  totalCount: number;
}

export function PostFilters({
  search, onSearchChange,
  activeFilter, onActiveFilterChange,
  showFilters, onToggleFilters,
  hasActiveFilters,
  selectedCategory, onSelectedCategoryChange,
  dateRange, onDateRangeChange,
  allCategories, onClearAll,
  filteredCount, totalCount,
}: PostFiltersProps) {
  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col sm:flex-row gap-3">
        <ToggleGroup type="single" value={activeFilter} onValueChange={(v) => v && onActiveFilterChange(v)}>
          {filterOptions.map((opt) => (
            <ToggleGroupItem key={opt} value={opt} size="default">{opt}</ToggleGroupItem>
          ))}
        </ToggleGroup>

        <div className="flex-1 flex items-center gap-2 h-9 px-3 rounded-lg bg-[var(--bg-surface)] border border-[var(--border-default)] focus-within:border-[var(--brand-primary)] transition-colors">
          <Search size={14} className="text-[var(--text-tertiary)] flex-shrink-0" />
          <input
            type="text"
            placeholder="搜索标题、标签、内容、分类..."
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            className="flex-1 bg-transparent text-sm text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] outline-none"
          />
          {search && (
            <button onClick={() => onSearchChange("")} className="text-[var(--text-tertiary)] hover:text-[var(--text-primary)] transition-colors cursor-pointer">
              <X size={14} />
            </button>
          )}
        </div>

        <Button variant="outline" size="default" className="gap-2 flex-shrink-0" onClick={onToggleFilters}>
          <Filter size={14} className={hasActiveFilters ? "text-[var(--brand-primary)]" : ""} />
          高级筛选
          {showFilters ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
        </Button>
      </div>

      {showFilters && (
        <Card className="animate-fade-in">
          <CardContent className="p-4">
            <div className="flex flex-col gap-4">
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="flex-1">
                  <label className="block text-xs font-medium text-[var(--text-secondary)] mb-2">分类</label>
                  <Select value={selectedCategory} onValueChange={onSelectedCategoryChange}>
                    <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectGroup>
                        {allCategories.map((cat) => (
                          <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                        ))}
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex-1">
                  <label className="block text-xs font-medium text-[var(--text-secondary)] mb-2">日期范围</label>
                  <ToggleGroup type="single" value={dateRange} onValueChange={(v) => v && onDateRangeChange(v)}>
                    {dateRangeOptions.map((opt) => (
                      <ToggleGroupItem key={opt.value} value={opt.value} size="sm" className="flex-1 text-xs">{opt.label}</ToggleGroupItem>
                    ))}
                  </ToggleGroup>
                </div>
              </div>

              {hasActiveFilters && (
                <div className="flex items-center justify-between pt-3 border-t border-[var(--border-default)]">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs text-[var(--text-tertiary)]">激活的过滤器:</span>
                    {search && <Badge variant="default" className="gap-1">搜索: {search.slice(0, 20)}{search.length > 20 && "..."}</Badge>}
                    {activeFilter !== "全部" && <Badge variant="default">状态: {activeFilter}</Badge>}
                    {selectedCategory !== "全部分类" && <Badge variant="default">分类: {selectedCategory}</Badge>}
                    {dateRange !== "all" && <Badge variant="default">日期: {dateRangeOptions.find((o) => o.value === dateRange)?.label}</Badge>}
                  </div>
                  <Button variant="outline" size="sm" onClick={onClearAll} className="gap-1 flex-shrink-0">
                    <X size={12} />清除所有
                  </Button>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {(hasActiveFilters || filteredCount !== totalCount) && (
        <div className="flex items-center gap-2 text-sm">
          <span className="text-[var(--text-secondary)]">
            显示 <span className="font-semibold text-[var(--brand-primary)]">{filteredCount}</span> / {totalCount} 篇文章
          </span>
          {hasActiveFilters && (
            <button onClick={onClearAll} className="text-[var(--text-tertiary)] hover:text-[var(--brand-primary)] transition-colors cursor-pointer text-xs underline">清除过滤</button>
          )}
        </div>
      )}
    </div>
  );
}
