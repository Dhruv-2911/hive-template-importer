"use client";

import { Layers, List, MessageSquareText, Search, X } from "lucide-react";
import { useEffect, useId, useMemo, useRef, useState, type KeyboardEvent, type ReactNode } from "react";

import type { TemplateTree } from "@/lib/api";
import { MAX_HITS, MIN_QUERY, search, searchIndex, type Hit } from "@/lib/search";

import { ui } from "./styles";

const KIND = { section: { icon: Layers, label: "Section" }, item: { icon: List, label: "Item" }, comment: { icon: MessageSquareText, label: "Comment" } };

type Props = { template: TemplateTree; onOpen: (itemId: string, row?: number) => void };

/** Find a section, item or comment by its name or text, and open it (SPEC.md US9). An ARIA combobox. */
export function TemplateSearch({ template, onOpen }: Props) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const input = useRef<HTMLInputElement>(null);
  const listId = useId();
  const index = useMemo(() => searchIndex(template), [template]);
  const { hits, total } = useMemo(() => search(index, query), [index, query]);
  const ready = query.trim().length >= MIN_QUERY;
  const shown = open && ready;
  const isMac = typeof navigator !== "undefined" && /Mac|iPhone|iPad/.test(navigator.platform);

  useEffect(() => {
    // Ctrl/⌘+K from anywhere on the template page.
    function focus(event: globalThis.KeyboardEvent) {
      if (event.key.toLowerCase() === "k" && (event.metaKey || event.ctrlKey)) {
        event.preventDefault();
        input.current?.focus();
        input.current?.select();
      }
    }
    document.addEventListener("keydown", focus);
    return () => document.removeEventListener("keydown", focus);
  }, []);

  function choose(hit: Hit | undefined) {
    if (!hit) return;
    setOpen(false);
    onOpen(hit.itemId, hit.row);
  }

  function onKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      setOpen(true);
      const step = event.key === "ArrowDown" ? 1 : -1;
      if (hits.length) setActive((current) => (current + step + hits.length) % hits.length);
    } else if (event.key === "Enter") {
      event.preventDefault();
      if (shown) choose(hits[active]);
    } else if (event.key === "Escape") {
      if (query) {
        event.preventDefault();
        setQuery("");
      } else {
        input.current?.blur();
      }
      setOpen(false);
    }
  }

  const optionId = (i: number) => `${listId}-option-${i}`;
  return (
    <div className="relative">
      <Search aria-hidden className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-meta" />
      <input
        ref={input}
        type="text"
        role="combobox"
        aria-label="Search this template"
        aria-expanded={shown}
        aria-controls={listId}
        aria-autocomplete="list"
        aria-activedescendant={shown && hits.length ? optionId(active) : undefined}
        placeholder="Search this template…"
        value={query}
        onChange={(event) => {
          setQuery(event.target.value);
          setActive(0);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        onKeyDown={onKeyDown}
        className={`w-full pl-9 pr-20 ${ui.input}`}
      />
      {query ? (
        <button
          type="button"
          aria-label="Clear the search"
          onMouseDown={(event) => event.preventDefault()} // keep focus in the box
          onClick={() => {
            setQuery("");
            input.current?.focus();
          }}
          className={`absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1 text-meta hover:bg-page hover:text-ink ${ui.focus}`}
        >
          <X aria-hidden className="size-4" />
        </button>
      ) : (
        <kbd className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 rounded border border-line bg-page px-1.5 py-0.5 font-sans text-xs text-meta">
          {isMac ? "⌘K" : "Ctrl K"}
        </kbd>
      )}

      <div
        hidden={!shown}
        className={`absolute left-0 top-full z-30 mt-2 w-[min(40rem,calc(100vw-22rem))] overflow-hidden shadow-lg ${ui.card}`}
      >
        <p role="status" className="border-b border-line bg-page px-4 py-2 text-xs text-meta">
          {!ready
            ? ""
            : total === 0
              ? `Nothing in this template matches “${query.trim()}”.`
              : total > MAX_HITS
                ? `Showing the first ${MAX_HITS} of ${total} matches.`
                : `${total} ${total === 1 ? "match" : "matches"}.`}
        </p>
        <ul id={listId} role="listbox" aria-label="Search results" className="scrollbar-thin max-h-[26rem] overflow-y-auto py-1">
          {hits.map((hit, i) => {
            const { icon: Icon, label } = KIND[hit.kind];
            return (
              <li
                key={hit.key}
                id={optionId(i)}
                role="option"
                aria-selected={i === active}
                onMouseDown={(event) => event.preventDefault()} // choose before the box loses focus
                onMouseEnter={() => setActive(i)}
                onClick={() => choose(hit)}
                className={`flex cursor-pointer gap-3 px-4 py-2.5 ${i === active ? "bg-tint" : ""}`}
              >
                <Icon aria-hidden className={`mt-0.5 size-4 shrink-0 ${i === active ? "text-accent" : "text-meta"}`} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-ink">
                    <Marked text={hit.label} query={query} />
                  </p>
                  <p className="truncate text-xs text-muted">
                    {label}
                    {hit.kind !== "section" && ` in ${hit.where}`}
                    {hit.row !== undefined && ` · Row ${hit.row}`}
                  </p>
                  {hit.excerpt && (
                    <p className="mt-0.5 line-clamp-2 text-xs text-muted">
                      <Marked text={hit.excerpt} query={query} />
                    </p>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}

/** The text with each occurrence of the query marked. */
function Marked({ text, query }: { text: string; query: string }) {
  const needle = query.trim().toLocaleLowerCase();
  if (!needle) return text;
  const parts: ReactNode[] = [];
  const lower = text.toLocaleLowerCase();
  let from = 0;
  for (let at = lower.indexOf(needle); at >= 0; at = lower.indexOf(needle, from)) {
    parts.push(text.slice(from, at));
    parts.push(
      <mark key={at} className="rounded-sm bg-tint font-semibold text-accent">
        {text.slice(at, at + needle.length)}
      </mark>,
    );
    from = at + needle.length;
  }
  parts.push(text.slice(from));
  return parts;
}
