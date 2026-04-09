import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react-swc'
import tailwindcss from '@tailwindcss/vite'
import { createRequire } from 'module'

const require = createRequire(import.meta.url)

// https://vite.dev/config/
export default defineConfig({
  plugins: [tailwindcss(), react()],
  resolve: {
    alias: {
      // Use require.resolve to find the EXACT physical location of each singleton
      'prosemirror-model': require.resolve('prosemirror-model'),
      'prosemirror-state': require.resolve('prosemirror-state'),
      'prosemirror-view': require.resolve('prosemirror-view'),
      'prosemirror-transform': require.resolve('prosemirror-transform'),
      'prosemirror-commands': require.resolve('prosemirror-commands'),
      'prosemirror-keymap': require.resolve('prosemirror-keymap'),
      'prosemirror-inputrules': require.resolve('prosemirror-inputrules'),
    }
  }
})
