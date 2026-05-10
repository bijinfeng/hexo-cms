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
import { GripVertical, EyeOff, Settings2 } from "lucide-react";
import { useState, useEffect, useCallback } from "react";

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
  const [showPicker, setShowPicker] = useState(false);

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
        <div className="relative">
          <button
            onClick={() => setShowPicker(!showPicker)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-muted)] rounded-lg transition-colors cursor-pointer"
          >
            <Settings2 size={14} />
            自定义仪表板
          </button>
          {showPicker && (
            <div className="absolute right-0 top-full mt-1 w-56 bg-[var(--bg-card)] border border-[var(--border-default)] rounded-xl shadow-lg z-50 p-2">
              {widgetDefinitions.map((w) => {
                const isVisible = !layout.hidden.includes(w.id);
                return (
                  <button
                    key={w.id}
                    onClick={() => toggleWidget(w.id)}
                    className="w-full flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-[var(--bg-muted)] transition-colors cursor-pointer text-sm text-left"
                  >
                    <div className={`w-4 h-4 rounded border-2 flex items-center justify-center transition-colors ${
                      isVisible ? "bg-primary-500 border-primary-500" : "border-[var(--border-default)]"
                    }`}>
                      {isVisible && (
                        <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                          <path d="M2 5l2 2 4-4" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      )}
                    </div>
                    <span className={isVisible ? "text-[var(--text-primary)]" : "text-[var(--text-tertiary)]"}>
                      {w.title}
                    </span>
                    {!isVisible && <EyeOff size={12} className="ml-auto text-[var(--text-tertiary)]" />}
                  </button>
                );
              })}
            </div>
          )}
        </div>
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
