import { Extension } from '@tiptap/core'

export const NeuralSelectionCallback = Extension.create({
  name: 'neuralSelectionCallback',

  addStorage() {
    return {
      selectedRange: null,
    }
  },

  onTransaction({ transaction }) {
    if (transaction.selectionSet) {
      this.storage.selectedRange = transaction.selection
    }
  },
})
