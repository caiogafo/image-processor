import { useEffect, useCallback, useState } from 'react'
import api from '../services/api'
import { ImageRecord } from '../types'

const STATUS_DOT: Record<string, string> = {
  pending: 'bg-yellow-400',
  processing: 'bg-blue-400 animate-pulse',
  done: 'bg-green-400',
  error: 'bg-red-400',
}
const STATUS_LABEL: Record<string, string> = {
  pending: 'Aguardando',
  processing: 'Processando',
  done: 'Concluído',
  error: 'Erro',
}

interface Props {
  image: ImageRecord
  onDeleted: (id: string) => void
  onUpdated: (img: ImageRecord) => void
  onClick: () => void
}

export function ImageCard({ image: initial, onDeleted, onUpdated, onClick }: Props) {
  const [image, setImage] = useState(initial)

  const poll = useCallback(async () => {
    const { data } = await api.get<ImageRecord>(`/images/${image.id}`)
    setImage(data)
    onUpdated(data)
  }, [image.id])

  useEffect(() => {
    if (image.status === 'pending' || image.status === 'processing') {
      const t = setInterval(poll, 2500)
      return () => clearInterval(t)
    }
  }, [image.status, poll])

  const thumb = image.thumbnail_url ?? image.original_url

  return (
    <div
      onClick={onClick}
      className="group relative bg-[#13131a] border border-white/5 rounded-2xl overflow-hidden cursor-pointer hover:border-violet-500/40 hover:scale-[1.02] transition-all duration-200"
    >
      {/* Image */}
      <div className="relative aspect-square bg-[#0a0a0f] overflow-hidden">
        {thumb
          ? <img src={thumb} alt={image.original_filename} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
          : <div className="w-full h-full flex items-center justify-center text-white/10 text-3xl">🖼️</div>
        }

        {/* Overlay on hover */}
        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
          <span className="text-xs text-white font-semibold bg-white/10 px-3 py-1.5 rounded-full backdrop-blur-sm">Ver detalhes</span>
        </div>

        {/* Status badge */}
        <div className="absolute top-2 right-2 flex items-center gap-1.5 bg-black/60 backdrop-blur-sm px-2 py-1 rounded-full">
          <div className={`w-1.5 h-1.5 rounded-full ${STATUS_DOT[image.status]}`} />
          <span className="text-xs text-white/70">{STATUS_LABEL[image.status]}</span>
        </div>
      </div>

      {/* Footer */}
      <div className="p-3">
        <p className="text-xs text-white/60 truncate font-medium">{image.original_filename}</p>
        {image.width && (
          <p className="text-xs text-white/25 mt-0.5">{image.width}×{image.height} · {image.file_size_kb}KB</p>
        )}
        {image.status === 'done' && image.operations?.length > 0 && (
          <div className="flex gap-1 mt-2 flex-wrap">
            {image.no_bg_url && <span className="text-xs bg-fuchsia-500/15 text-fuchsia-400 px-1.5 py-0.5 rounded">sem fundo</span>}
            {image.operations.includes('auto_enhance') && <span className="text-xs bg-violet-500/15 text-violet-400 px-1.5 py-0.5 rounded">melhorada</span>}
            <span className="text-xs bg-green-500/10 text-green-400 px-1.5 py-0.5 rounded">3 tamanhos</span>
          </div>
        )}
      </div>
    </div>
  )
}
