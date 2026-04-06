import { Mark, mergeAttributes } from "@tiptap/core";

export const CommentExtension = Mark.create({
  name: "comment",

  addAttributes() {
    return {
      commentId: {
        default: null,
        parseHTML: (element) => element.getAttribute("data-comment-id"),
        renderHTML: (attributes) => ({
          "data-comment-id": attributes.commentId,
        }),
      },
    };
  },

  renderHTML({ HTMLAttributes }) {
    return [
      "span",
      mergeAttributes(HTMLAttributes, {
        class: "bg-indigo-100 border-b-2 border-indigo-500 cursor-pointer hover:bg-indigo-200 transition-colors",
      }),
      0,
    ];
  },
});
