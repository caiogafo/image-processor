import { useState, useEffect } from 'react'
import { UploadZone } from '../components/UploadZone'
import { ImageCard } from '../components/ImageCard'
import { ImageRecord } from '../types'
import api from '../services/api'

export default function Home() {
  const [images, setImages] = useState<ImageRecord[]>([])
  const [loading, setLoading] = useState(true)

  async function loadImages() {
    try {
      const { data } = await api.get<ImageRecord[]>('/images/')
      setImages(data)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadImages() }, [])

  function onUploaded(image: ImageRecord) {
    setImages((prev) => [image, ...prev])
  }

  function onDeleted(id: string) {
    setImages((prev) => prev.filter((i) => i.id !== id))
  }

  return (
    <div className="min-h-screen bg-slate-900">
      {/* Header */}
      <header className="border-b border-slate-800 px-6 py-4">
        <div className="max-w-6xl mx-auto flex items-center gap-3">
          <span className="text-2xl">🖼️</span>
          <div>
            <h1 className="text-white font-black text-xl">Image Processor</h1>
            <p className="text-slate-400 text-xs">Upload · Resize automático · Remoção de fundo com IA</p>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-10 space-y-10">
        {/* Upload */}
        <section>
          <h2 className="text-slate-300 font-semibold text-sm uppercase tracking-widest mb-4">
            Upload de Imagem
          </h2>
          <UploadZone onUploaded={onUploaded} />
        </section>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-slate-800 border border-slate-700 rounded-xl p-4 text-center">
            <p className="text-3xl font-black text-violet-400">{images.length}</p>
            <p className="text-slate-400 text-sm">Imagens</p>
          </div>
          <div className="bg-slate-800 border border-slate-700 rounded-xl p-4 text-center">
            <p className="text-3xl font-black text-green-400">
              {images.filter((i) => i.status === 'done').length}
            </p>
            <p className="text-slate-400 text-sm">Processadas</p>
          </div>
          <div className="bg-slate-800 border border-slate-700 rounded-xl p-4 text-center">
            <p className="text-3xl font-black text-yellow-400">
              {images.filter((i) => i.no_bg_url).length}
            </p>
            <p className="text-slate-400 text-sm">Sem fundo (IA)</p>
          </div>
        </div>

        {/* Gallery */}
        <section>
          <h2 className="text-slate-300 font-semibold text-sm uppercase tracking-widest mb-4">
            Galeria
          </h2>
          {loading ? (
            <div className="text-center py-20 text-slate-500">Carregando...</div>
          ) : images.length === 0 ? (
            <div className="text-center py-20 text-slate-600">
              <p className="text-4xl mb-3">📂</p>
              <p>Nenhuma imagem ainda. Faça um upload acima!</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {images.map((image) => (
                <ImageCard key={image.id} image={image} onDeleted={onDeleted} />
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  )
}
/* Gallery loads all images and updates on upload/delete */
