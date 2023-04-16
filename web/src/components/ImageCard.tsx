import { useState, useEffect, useCallback } from 'react'
import api from '../services/api'
import { ImageRecord } from '../types'

const STATUS_LABEL: Record<string, string> = {
  pending: '⏳ Aguardando',
  processing: '⚙️ Processando',
  done: '✅ Concluído',
  error: '❌ Erro',
}
const STATUS_COLOR: Record<string, string> = {
  pending: 'text-yellow-400',
  processing: 'text-blue-400 animate-pulse',
  done: 'text-green-400',
  error: 'text-red-400',
}

const OP_LABELS: Record<string, string> = {
  upload_original: 'Upload original',
  resize_thumbnail_medium_large: 'Resize 3 tamanhos',
  compress_85_quality: 'Compressão 85%',
  ai_remove_background: 'IA: Remove fundo',
}

interface Props {
  image: ImageRecord
  onDeleted: (id: string) => void
}

export function ImageCard({ image: initial, onDeleted }: Props) {
  const [image, setImage] = useState(initial)
  const [preview, setPreview] = useState<'original' | 'thumbnail' | 'medium' | 'large' | 'no_bg'>('medium')

  const poll = useCallback(async () => {
    const { data } = await api.get<ImageRecord>(`/images/${image.id}`)
    setImage(data)
  }, [image.id])

  useEffect(() => {
    if (image.status === 'pending' || image.status === 'processing') {
      const interval = setInterval(poll, 2000)
      return () => clearInterval(interval)
    }
  }, [image.status, poll])

  const currentUrl = image[`${preview}_url` as keyof ImageRecord] as string ?? image.original_url

  async function handleDelete() {
    if (!confirm('Deletar esta imagem?')) return
    await api.delete(`/images/${image.id}`)
    onDeleted(image.id)
  }

  return (
    <div className="bg-slate-800 border border-slate-700 rounded-2xl overflow-hidden hover:border-violet-500/40 transition">
      {/* Preview */}
      <div className="relative aspect-square bg-slate-900 overflow-hidden">
        {currentUrl ? (
          <img src={currentUrl} alt={image.original_filename} className="w-full h-full object-contain" />
        ) : (
          <div className="flex items-center justify-center h-full text-slate-600 text-4xl">🖼️</div>
        )}
        <div className={`absolute top-2 right-2 text-xs font-bold px-2 py-1 rounded-full bg-slate-900/80 ${STATUS_COLOR[image.status]}`}>
          {STATUS_LABEL[image.status]}
        </div>
      </div>

      <div className="p-4 space-y-3">
        <p className="text-white font-semibold text-sm truncate">{image.original_filename}</p>

        {image.width && (
          <p className="text-slate-400 text-xs">
            {image.width}×{image.height}px · {image.file_size_kb}KB original
          </p>
        )}

        {/* Size selector */}
        {image.status === 'done' && (
          <div className="flex flex-wrap gap-1">
            {(['original', 'thumbnail', 'medium', 'large'] as const).map((s) => (
              <button key={s}
                onClick={() => setPreview(s)}
                className={`text-xs px-2 py-0.5 rounded transition ${preview === s ? 'bg-violet-600 text-white' : 'bg-slate-700 text-slate-300 hover:bg-slate-600'}`}>
                {s}
              </button>
            ))}
            {image.no_bg_url && (
              <button
                onClick={() => setPreview('no_bg')}
                className={`text-xs px-2 py-0.5 rounded transition ${preview === 'no_bg' ? 'bg-violet-600 text-white' : 'bg-slate-700 text-slate-300 hover:bg-slate-600'}`}>
                sem fundo
              </button>
            )}
          </div>
        )}

        {/* Operations */}
        {image.operations?.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {image.operations.map((op) => (
              <span key={op} className="text-xs bg-violet-500/10 text-violet-400 border border-violet-500/20 px-2 py-0.5 rounded">
                {OP_LABELS[op] ?? op}
              </span>
            ))}
          </div>
        )}

        {image.error_message && (
          <p className="text-red-400 text-xs">{image.error_message}</p>
        )}

        <div className="flex gap-2 pt-1">
          {currentUrl && (
            <a href={currentUrl} target="_blank" rel="noreferrer"
              className="flex-1 text-center text-xs bg-violet-600 hover:bg-violet-500 text-white px-3 py-1.5 rounded-lg transition">
              Download
            </a>
          )}
          <button onClick={handleDelete}
            className="text-xs bg-slate-700 hover:bg-red-900/50 hover:text-red-400 text-slate-300 px-3 py-1.5 rounded-lg transition">
            Deletar
          </button>
        </div>
      </div>
    </div>
  )
}
/* ImageCard polls /images/:id every 2s while status is pending/processing */
