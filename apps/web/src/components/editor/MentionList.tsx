import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useState,
} from 'react'
import { User, AtSign } from 'lucide-react'

// --- Suggestion Dropdown UI ---
export const MentionList = forwardRef((props: any, ref) => {
  const [selectedIndex, setSelectedIndex] = useState(0)

  const selectItem = (index: number) => {
    const item = props.items[index]
    if (item) {
      props.command({ id: item.id, label: item.label })
    }
  }

  const upHandler = () => {
    setSelectedIndex(((selectedIndex + props.items.length) - 1) % props.items.length)
  }

  const downHandler = () => {
    setSelectedIndex((selectedIndex + 1) % props.items.length)
  }

  const enterHandler = () => {
    selectItem(selectedIndex)
  }

  useEffect(() => setSelectedIndex(0), [props.items])

  useImperativeHandle(ref, () => ({
    onKeyDown: ({ event }: { event: KeyboardEvent }) => {
      if (event.key === 'ArrowUp') {
        upHandler()
        return true
      }
      if (event.key === 'ArrowDown') {
        downHandler()
        return true
      }
      if (event.key === 'Enter') {
        enterHandler()
        return true
      }
      return false
    },
  }))

  return (
    <div className="bg-bg/95 backdrop-blur-3xl border border-white/10 rounded-[28px] shadow-[0_20px_60px_rgba(0,0,0,0.6)] overflow-hidden min-w-[240px] animate-in zoom-in-95 duration-200">
      <div className="p-4 border-b border-white/5 bg-white/05">
         <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-accent/20 border border-accent/20">
               <AtSign className="h-4 w-4 text-accent" />
            </div>
            <span className="text-[10px] font-black uppercase tracking-[0.5em] text-accent/80">Neural Mentions</span>
         </div>
      </div>
      
      <div className="p-2 max-h-[300px] overflow-y-auto scrollbar-hide">
        {props.items.length > 0 ? (
          props.items.map((item: any, index: number) => (
            <button
              key={index}
              onClick={() => selectItem(index)}
              className={`w-full flex items-center gap-4 px-4 py-3.5 rounded-2xl transition-all duration-300 text-left group
                ${index === selectedIndex ? 'bg-accent text-bg shadow-[0_10px_30px_var(--color-accent)] scale-[1.02] z-10' : 'hover:bg-white/5 text-text-muted hover:text-white'}
              `}
            >
              <div className={`h-8 w-8 rounded-full border border-white/10 flex items-center justify-center text-[10px] font-black group-hover:scale-110 transition-transform ${index === selectedIndex ? 'bg-white/20 text-bg' : 'bg-white/5'}`}>
                 {item.label[0].toUpperCase()}
              </div>
              <div className="flex flex-col">
                 <span className="text-[12px] font-black tracking-tight">{item.label}</span>
                 <span className={`text-[8px] font-black uppercase tracking-[0.1em] opacity-40 ${index === selectedIndex ? 'text-bg' : 'text-accent'}`}>{item.id === 'all' ? 'BROADCAST' : 'NODE'}</span>
              </div>
            </button>
          ))
        ) : (
          <div className="p-10 text-center space-y-3 opacity-20">
             <User className="h-8 w-8 mx-auto" />
             <p className="text-[10px] font-black uppercase tracking-[0.2em]">No Users Found</p>
          </div>
        )}
      </div>

      <div className="bg-white/5 p-4 flex justify-between items-center px-6">
         <div className="flex items-center gap-2">
            <span className="h-4 w-4 rounded-md border border-white/20 flex items-center justify-center text-[8px] font-bold text-white/40">↵</span>
            <span className="text-[8px] font-black text-white/30 uppercase tracking-[0.2em]">Select</span>
         </div>
         <div className="flex items-center gap-2">
            <span className="h-4 w-4 rounded-md border border-white/20 flex items-center justify-center rotate-90 text-[8px] font-bold text-white/40">{'< >'}</span>
            <span className="text-[8px] font-black text-white/30 uppercase tracking-[0.2em]">Navigate</span>
         </div>
      </div>
    </div>
  )
})

MentionList.displayName = 'MentionList'
