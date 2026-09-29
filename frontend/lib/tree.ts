import type { Comment, Item, Section, TemplateTree } from "./api";

// Immutable updates to a cached template tree, so a saved edit shows everywhere without refetching the tree.

export function withSection(tree: TemplateTree, id: string, change: Partial<Section>): TemplateTree {
  return { ...tree, sections: tree.sections.map((s) => (s.id === id ? { ...s, ...change } : s)) };
}

export function withItem(tree: TemplateTree, id: string, change: Partial<Item>): TemplateTree {
  return {
    ...tree,
    sections: tree.sections.map((s) => ({ ...s, items: s.items.map((i) => (i.id === id ? { ...i, ...change } : i)) })),
  };
}

export function withComment(tree: TemplateTree, saved: Comment): TemplateTree {
  return {
    ...tree,
    sections: tree.sections.map((s) => ({
      ...s,
      items: s.items.map((i) => ({ ...i, comments: i.comments.map((c) => (c.id === saved.id ? saved : c)) })),
    })),
  };
}
