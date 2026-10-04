import {
  closestCenter,
  DndContext,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { dropHandler } from "./drop";
import type { CSSProperties, ReactElement, ReactNode } from "react";

/** What a sortable row gets: its drag handle's props, and its own style while moving. */
export interface Handle {
  readonly attributes: ReturnType<typeof useSortable>["attributes"];
  readonly listeners: ReturnType<typeof useSortable>["listeners"];
  readonly setActivator: (el: HTMLElement | null) => void;
}

export interface SortableListProps {
  readonly ids: readonly string[];
  readonly onMove: (id: string, overId: string) => void;
  readonly children: ReactNode;
}

/** Drag with a pointer, or focus a handle and use Space and the arrow keys. */
export function SortableList({ ids, onMove, children }: SortableListProps): ReactElement {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );
  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={dropHandler(onMove)}
    >
      <SortableContext items={[...ids]} strategy={verticalListSortingStrategy}>
        {children}
      </SortableContext>
    </DndContext>
  );
}

export interface SortableItemProps {
  readonly id: string;
  readonly className: string;
  readonly as?: "li" | "div";
  readonly children: (handle: Handle) => ReactNode;
}

export function SortableItem({
  id,
  className,
  as = "div",
  children,
}: SortableItemProps): ReactElement {
  const {
    attributes,
    listeners,
    setNodeRef,
    setActivatorNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });
  const style: CSSProperties = { transform: CSS.Translate.toString(transform), transition };
  const Tag = as;
  return (
    <Tag
      ref={setNodeRef}
      style={style}
      className={isDragging ? `${className} dragging` : className}
    >
      {children({ attributes, listeners, setActivator: setActivatorNodeRef })}
    </Tag>
  );
}

export function DragHandle({
  attributes,
  listeners,
  setActivator,
  label,
}: Handle & { readonly label: string }): ReactElement {
  return (
    <button
      type="button"
      className="drag"
      ref={setActivator}
      {...attributes}
      {...listeners}
      aria-label={label}
      title="Drag to reorder"
    >
      ⋮⋮
    </button>
  );
}
