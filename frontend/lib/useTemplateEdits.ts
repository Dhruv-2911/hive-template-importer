"use client";

import { useQueryClient } from "@tanstack/react-query";

import { api, type CommentChange, type TemplateTree } from "./api";
import { withComment, withItem, withSection } from "./tree";

/** Save an edit, then put the server's answer into the cached tree. */
export function useTemplateEdits(templateId: string) {
  const queryClient = useQueryClient();
  const key = ["template", templateId];
  const update = (change: (tree: TemplateTree) => TemplateTree) =>
    queryClient.setQueryData<TemplateTree>(key, (tree) => (tree ? change(tree) : tree));

  return {
    renameTemplate: async (name: string) => {
      const saved = await api.renameTemplate(templateId, name);
      update((tree) => ({ ...tree, name: saved.name }));
      queryClient.invalidateQueries({ queryKey: ["templates"] });
    },
    renameSection: async (id: string, name: string) => {
      const saved = await api.renameSection(id, name);
      update((tree) => withSection(tree, id, { name: saved.name }));
    },
    renameItem: async (id: string, name: string) => {
      const saved = await api.renameItem(id, name);
      update((tree) => withItem(tree, id, { name: saved.name }));
    },
    editComment: async (id: string, change: CommentChange) => {
      const saved = await api.editComment(id, change);
      update((tree) => withComment(tree, saved));
    },
  };
}

export type TemplateEdits = ReturnType<typeof useTemplateEdits>;
