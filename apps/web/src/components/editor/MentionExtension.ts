import { Node, mergeAttributes } from "@tiptap/core";

export const MentionExtension = Node.create({
  name: "mention",
  group: "inline",
  inline: true,
  selectable: false,
  atom: true,

  addAttributes() {
    return {
      id: {
        default: null,
        parseHTML: (element) => element.getAttribute("data-id"),
        renderHTML: (attributes) => ({
          "data-id": attributes.id,
        }),
      },
      label: {
        default: null,
        parseHTML: (element) => element.getAttribute("data-label"),
        renderHTML: (attributes) => ({
          "data-label": attributes.label,
        }),
      },
    };
  },

  parseHTML() {
    return [{ tag: "span[data-mention]" }];
  },

  renderHTML({ node, HTMLAttributes }) {
    return [
      "span",
      mergeAttributes(HTMLAttributes, {
        "data-mention": "",
        class: "bg-indigo-600 text-white px-1.5 py-0.5 rounded-md font-medium text-xs mx-0.5 inline-flex items-center",
      }),
      `@${node.attrs.label}`,
    ];
  },
});
