import { useEffect, useMemo } from 'react'
import { useParams } from 'react-router-dom'
import { WebsocketProvider } from 'y-websocket'
import * as Y from 'yjs'
import { EditorContent, useEditor } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Collaboration from '@tiptap/extension-collaboration'
import { Extension } from '@tiptap/core'
import { yCursorPlugin } from 'y-prosemirror'
import { useAuth } from '../hooks/useAuth'
import { API_BASE_URL } from '../services/api'

function toWsUrl(httpUrl: string) {
  if (httpUrl.startsWith('https://')) return httpUrl.replace(/^https:\/\//, 'wss://')
  if (httpUrl.startsWith('http://')) return httpUrl.replace(/^http:\/\//, 'ws://')
  return httpUrl
}

const YjsCursorExtension = Extension.create<{ awareness: any }>({
  name: 'yjsCursor',
  addProseMirrorPlugins() {
    return [yCursorPlugin(this.options.awareness)]
  },
})

function userColorFromString(input: string) {
  // Deterministic "nice enough" color for awareness.
  let hash = 0
  for (let i = 0; i < input.length; i++) hash = (hash * 31 + input.charCodeAt(i)) >>> 0
  const color = `#${(hash % 0xffffff).toString(16).padStart(6, '0')}`
  return color
}

export function DocumentEditorPage() {
  const { id } = useParams<{ id: string }>()
  const { accessToken, user } = useAuth()

  const documentId = id ?? 'demo'
  const canEdit = true

  const wsUrl = useMemo(() => toWsUrl(API_BASE_URL), [])

  const ydoc = useMemo(() => new Y.Doc(), [documentId])
  const provider = useMemo(() => {
    return new WebsocketProvider(wsUrl, documentId, ydoc, {
      params: { token: accessToken ?? '' },
    })
  }, [wsUrl, documentId, accessToken, ydoc])

  useEffect(() => {
    if (!provider || !user) return
    provider.awareness.setLocalStateField('user', {
      name: user.email,
      color: userColorFromString(user.email),
    })
  }, [provider, user])

  useEffect(() => {
    return () => {
      provider.destroy()
      ydoc.destroy()
    }
  }, [provider, ydoc])

  const editor = useEditor(
    {
      editable: canEdit,
      extensions: [
        StarterKit,
        Collaboration.configure({ document: ydoc }),
        YjsCursorExtension.configure({ awareness: provider.awareness }),
      ],
      editorProps: {
        attributes: {
          class:
            'min-h-[60vh] w-full rounded bg-white/5 p-4 text-slate-100 outline-none',
        },
      },
    },
    [provider, canEdit],
  )

  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <h1 className="text-xl font-semibold text-white">Document: {documentId}</h1>
        <span className="text-sm text-slate-400">{canEdit ? 'Editable' : 'Read-only'}</span>
      </div>
      <EditorContent editor={editor} />
    </div>
  )
}

