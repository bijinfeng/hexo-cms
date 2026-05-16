import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, Settings2 } from "lucide-react";
import { useState, useEffect, useCallback } from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuCheckboxItem,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";
import { Button } from "./ui/button";

const STORAGE_KEY = "hexo-cms:dashboard-layout";

interface WidgetDefinition {
  id: string;
  title: string;
  defaultVisible: boolean;
}

export const AVAILABLE_WIDGETS: WidgetDefinition[] = [
  { id: "stats", title: "统计概览", defaultVisible: true },
  { id: "recent-posts", title: "最近文章", defaultVisible: true },
  { id: "quick-actions", title: "快捷操作", defaultVisible: true },
];

export interface DashboardLayout {
  order: string[];
  hidden: string[];
}

function loadLayout(): DashboardLayout {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch { /* ignore */ }
  return {
    order: AVAILABLE_WIDGETS.filter((w) => w.defaultVisible).map((w) => w.id),
    hidden: AVAILABLE_WIDGETS.filter((w) => !w.defaultVisible).map((w) => w.id),
  };
}

function saveLayout(layout: DashboardLayout): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(layout));
}

interface DraggableWidgetProps {
  id: string;
  children: React.ReactNode;
}

function DraggableWidget({ id, children }: DraggableWidgetProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} className="relative group">
      <button
        {...attributes}
        {...listeners}
        className="absolute -left-2 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity cursor-grab active:cursor-grabbing z-10 p-1 rounded hover:bg-[var(--bg-muted)]"
      >
        <GripVertical size={14} className="text-[var(--text-tertiary)]" />
      </button>
      {children}
    </div>
  );
}

interface DashboardWidgetGridProps {
  children: Array<{ id: string; title?: string; content: React.ReactNode }>;
}

export function DashboardWidgetGrid({ children }: DashboardWidgetGridProps) {
  const [layout, setLayout] = useState<DashboardLayout>(() => loadLayout());

  useEffect(() => {
    saveLayout(layout);
  }, [layout]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  );

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    setLayout((prev) => {
      const oldIndex = prev.order.indexOf(active.id as string);
      const newIndex = prev.order.indexOf(over.id as string);
      const newOrder = [...prev.order];
      newOrder.splice(oldIndex, 1);
      newOrder.splice(newIndex, 0, active.id as string);
      return { ...prev, order: newOrder };
    });
  }, []);

  const widgetDefinitions = [
    ...AVAILABLE_WIDGETS,
    ...children
      .filter((child) => !AVAILABLE_WIDGETS.some((widget) => widget.id === child.id))
      .map((child) => ({
        id: child.id,
        title: child.title ?? child.id,
        defaultVisible: true,
      })),
  ];

  const visibleChildren = children.filter((c) => !layout.hidden.includes(c.id));
  const sortedChildren = layout.order
    .map((id) => visibleChildren.find((c) => c.id === id))
    .filter(Boolean) as Array<{ id: string; content: React.ReactNode }>;
  const unorderedChildren = visibleChildren.filter((child) => !layout.order.includes(child.id));
  const renderedChildren = [...sortedChildren, ...unorderedChildren];

  const visibleIds = renderedChildren.map((c) => c.id);

  function toggleWidget(id: string) {
    setLayout((prev) => ({
      ...prev,
      hidden: prev.hidden.includes(id)
        ? prev.hidden.filter((h) => h !== id)
        : [...prev.hidden, id],
    }));
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div />
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" className="gap-1.5 text-[var(--text-secondary)]">
              <Settings2 size={14} />
              自定义仪表板
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            {widgetDefinitions.map((w) => {
              const isVisible = !layout.hidden.includes(w.id);
              return (
                <DropdownMenuCheckboxItem
                  key={w.id}
                  checked={isVisible}
                  onCheckedChange={() => toggleWidget(w.id)}
                >
                  {w.title}
                </DropdownMenuCheckboxItem>
              );
            })}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={visibleIds} strategy={verticalListSortingStrategy}>
          <div className="space-y-6">
            {renderedChildren.map((child) => (
              <DraggableWidget key={child.id} id={child.id}>
                {child.content}
              </DraggableWidget>
            ))}
          </div>
        </SortableContext>
      </DndContext>
    </div>
  );
}
