import { useState, useRef } from 'react'
import api from '../services/api'
import { ImageRecord } from '../types'

interface Props {
  onUploaded: (image: ImageRecord) => void
}

export function UploadZone({ onUploaded }: Props) {
  const [dragging, setDragging] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [removeBg, setRemoveBg] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  async function handleFile(file: File) {
    if (!file.type.startsWith('image/')) return
    setUploading(true)
    try {
      const form = new FormData()
      form.append('file', file)
      const { data } = await api.post<ImageRecord>(`/images/upload?remove_bg=${removeBg}`, form)
      onUploaded(data)
    } catch (err: any) {
      alert(err.response?.data?.detail ?? 'Erro ao fazer upload.')
    } finally {
      setUploading(false)
    }
  }

  function onDrop(e: React.DragEvent) {
    e.preventDefault()
    setDragging(false)
    const file = e.dataTransfer.files[0]
    if (file) handleFile(file)
  }

  return (
    <div className="space-y-4">
      <div
        onClick={() => !uploading && inputRef.current?.click()}
        onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        className={`border-2 border-dashed rounded-2xl p-12 text-center cursor-pointer transition-all
          ${dragging ? 'border-violet-500 bg-violet-500/10' : 'border-slate-600 hover:border-violet-400 hover:bg-slate-800/50'}
          ${uploading ? 'opacity-50 cursor-not-allowed' : ''}`}
      >
        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="hidden"
          onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
        />
        <div className="text-5xl mb-4">{uploading ? '⏳' : '🖼️'}</div>
        {uploading ? (
          <p className="text-violet-400 font-semibold">Enviando imagem...</p>
        ) : (
          <>
            <p className="text-slate-300 font-semibold text-lg">Arraste uma imagem ou clique para selecionar</p>
            <p className="text-slate-500 text-sm mt-2">JPG, PNG ou WEBP — máximo 10MB</p>
          </>
        )}
      </div>

      <label className="flex items-center gap-3 cursor-pointer select-none w-fit">
        <div
          onClick={() => setRemoveBg(!removeBg)}
          className={`w-11 h-6 rounded-full transition-colors relative ${removeBg ? 'bg-violet-600' : 'bg-slate-600'}`}
        >
          <div className={`w-4 h-4 bg-white rounded-full absolute top-1 transition-all ${removeBg ? 'left-6' : 'left-1'}`} />
        </div>
        <span className="text-slate-300 text-sm">
          Remover fundo com IA <span className="text-violet-400 font-semibold">(rembg)</span>
        </span>
      </label>
    </div>
  )
}
/* UploadZone with drag-and-drop and toggle for AI bg removal */
