"use client";

import { ArrowLeft, ChevronRight, House, Layers } from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";

import type { TemplateTree } from "@/lib/api";

import { ui } from "./styles";

type Props = {
  template: TemplateTree;
  selectedItemId: string | undefined; // undefined: the Overview is open
  onSelect: (itemId: string) => void;
  onOverview: () => void;
};

const ENTRY = `flex w-full items-center gap-2 rounded-control px-2.5 py-2 text-left text-sm ${ui.focus}`;
const SELECTED = "bg-accent font-medium text-white";

/** The template's name, its Overview, and its sections in Spectora's order, each opening to show its items. */
export function SectionTree({ template, selectedItemId, onSelect, onOverview }: Props) {
  const ownerId = template.sections.find((s) => s.items.some((i) => i.id === selectedItemId))?.id;
  // A section is open if the inspector opened it, or if it holds the open item and they haven't closed it.
  const [toggled, setToggled] = useState(new Map<string, boolean>());
  const [shownOwner, setShownOwner] = useState(ownerId);
  if (ownerId !== shownOwner) {
    // An item opened from elsewhere (search, a report link) always shows its section.
    setShownOwner(ownerId);
    if (ownerId) setToggled((current) => new Map(current).set(ownerId, true));
  }
  const isOpen = (id: string) => toggled.get(id) ?? id === ownerId;
  const nav = useRef<HTMLElement>(null);

  useEffect(() => {
    // Keep the open item in view when it was opened from elsewhere. Only the panel scrolls, never the page.
    const panel = nav.current;
    const current = panel?.querySelector("[aria-current]");
    if (!panel || !current) return;
    const box = panel.getBoundingClientRect();
    const entry = current.getBoundingClientRect();
    if (entry.top < box.top || entry.bottom > box.bottom) panel.scrollTop += entry.top - box.top - box.height / 3;
  }, [selectedItemId]);

  return (
    <aside className="flex w-80 shrink-0 flex-col border-r border-line bg-surface">
      <div className="border-b border-line px-5 pb-4 pt-5">
        <Link href="/templates/" className={`inline-flex items-center gap-1.5 text-sm ${ui.link}`}>
          <ArrowLeft aria-hidden className="size-4" />
          Back to Templates
        </Link>
        <h1 className="mt-3 break-words text-base font-semibold leading-snug text-ink">{template.name}</h1>
        {(template.is_sample || template.copied_from_id) && (
          <div className="mt-2 flex flex-wrap items-center gap-2 text-sm">
            {template.is_sample && <span className={`${ui.badge} text-muted`}>Sample</span>}
            {template.copied_from_id && (
              <>
                <span className={`${ui.badge} text-muted`}>Copy</span>
                <Link href={`/template/?id=${template.copied_from_id}`} className={ui.link}>
                  Open the original
                </Link>
              </>
            )}
          </div>
        )}
      </div>
      <nav ref={nav} aria-label="Sections and items" className="scrollbar-thin flex-1 overflow-y-auto px-3 py-3">
        <button
          type="button"
          onClick={onOverview}
          aria-current={selectedItemId ? undefined : "true"}
          className={`${ENTRY} ${selectedItemId ? "text-ink hover:bg-page" : SELECTED}`}
        >
          <House aria-hidden className="size-4 shrink-0" />
          Overview
        </button>
        <ol className="mt-2 space-y-0.5">
          {template.sections.map((section) => {
            const open = isOpen(section.id);
            return (
              <li key={section.id}>
                <button
                  type="button"
                  aria-expanded={open}
                  aria-controls={`items-${section.id}`}
                  onClick={() => setToggled((current) => new Map(current).set(section.id, !open))}
                  className={`${ENTRY} font-medium text-ink hover:bg-page`}
                >
                  <ChevronRight
                    aria-hidden
                    className={`size-4 shrink-0 text-meta transition-transform motion-reduce:transition-none ${open ? "rotate-90" : ""}`}
                  />
                  <Layers aria-hidden className="size-4 shrink-0 text-meta" />
                  <span className="min-w-0 flex-1">{section.name}</span>
                  <span aria-hidden className="shrink-0 text-xs font-normal tabular-nums text-meta">
                    {section.items.length}
                  </span>
                </button>
                {open && (
                  <ul id={`items-${section.id}`} className="mb-1.5 ml-[1.1rem] space-y-0.5 border-l border-line py-0.5 pl-2.5">
                    {section.items.map((item) => {
                      const selected = item.id === selectedItemId;
                      return (
                        <li key={item.id}>
                          <button
                            type="button"
                            onClick={() => onSelect(item.id)}
                            aria-current={selected ? "true" : undefined}
                            className={`${ENTRY} justify-between py-1.5 ${selected ? SELECTED : "text-muted hover:bg-page hover:text-ink"}`}
                          >
                            <span>{item.name}</span>
                            <span className={`shrink-0 text-xs tabular-nums ${selected ? "text-white" : "text-meta"}`}>
                              {item.comments.length}
                            </span>
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </li>
            );
          })}
        </ol>
      </nav>
    </aside>
  );
}
