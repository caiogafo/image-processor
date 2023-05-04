import { useState, useEffect, useRef } from 'react'
import api from '../services/api'
import { ImageRecord, ProcessingOptions } from '../types'
import { ImageCard } from '../components/ImageCard'
import { Slider } from '../components/Slider'

const DEFAULT_OPTIONS: ProcessingOptions = {
  remove_bg: false,
  auto_enhance: false,
  custom_width: '',
  custom_height: '',
  brightness: 1.0,
  contrast: 1.0,
  saturation: 1.0,
  sharpness: 1.0,
  output_format: 'JPEG',
}

const OP_LABELS: Record<string, string> = {
  upload_original: 'Upload original',
  resize_thumbnail_medium_large: 'Resize 3 tamanhos',
  compress_85_quality: 'Compressão 85%',
  ai_remove_background: 'IA: Fundo removido',
  auto_enhance: 'IA: Auto-melhoria',
}

function buildCSSFilter(opts: ProcessingOptions): string {
  // auto_enhance stacks on top of manual sliders
  const b = opts.auto_enhance ? Math.min(opts.brightness * 1.05, 2) : opts.brightness
  const c = opts.auto_enhance ? Math.min(opts.contrast * 1.15, 2) : opts.contrast
  const s = opts.saturation
  // sharpness → slight contrast boost as CSS approximation
  const sharpContrast = 1 + (opts.sharpness - 1) * 0.12
  const finalContrast = opts.auto_enhance ? Math.min(c * 1.1 * sharpContrast, 3) : c * sharpContrast
  return `brightness(${b.toFixed(3)}) contrast(${finalContrast.toFixed(3)}) saturate(${s.toFixed(3)})`
}

function Toggle({ label, desc, value, onChange }: { label: string; desc: string; value: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="flex items-start gap-3 cursor-pointer select-none" onClick={() => onChange(!value)}>
      <div className={`mt-0.5 w-10 h-5 rounded-full transition-colors relative flex-shrink-0 ${value ? 'bg-violet-600' : 'bg-white/10'}`}>
        <div className={`w-3.5 h-3.5 bg-white rounded-full absolute top-0.5 transition-all ${value ? 'left-5' : 'left-0.5'}`} />
      </div>
      <div>
        <p className="text-sm font-semibold text-white/80">{label}</p>
        <p className="text-xs text-white/30">{desc}</p>
      </div>
    </div>
  )
}

const STATUS_DOT: Record<string, string> = { pending: 'bg-yellow-400', processing: 'bg-blue-400 animate-pulse', done: 'bg-green-400', error: 'bg-red-400' }
const STATUS_TXT: Record<string, string> = { pending: 'Aguardando', processing: 'Processando...', done: 'Concluído', error: 'Erro' }

function ImageModal({ image, onClose, onDeleted }: { image: ImageRecord; onClose: () => void; onDeleted: (id: string) => void }) {
  const [tab, setTab] = useState<'original' | 'thumbnail' | 'medium' | 'large' | 'no_bg'>('medium')
  const url = (image[`${tab}_url` as keyof ImageRecord] as string) ?? image.original_url

  async function handleDelete() {
    if (!confirm('Deletar?')) return
    await api.delete(`/images/${image.id}`)
    onDeleted(image.id)
    onClose()
  }

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-6" onClick={onClose}>
      <div className="bg-[#13131a] border border-white/10 rounded-3xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex" onClick={e => e.stopPropagation()}>
        <div className="flex-1 bg-[#0a0a0f] flex items-center justify-center min-h-80"
          style={{ backgroundImage: 'radial-gradient(circle, #1a1a2e 1px, transparent 1px)', backgroundSize: '20px 20px' }}>
          {url ? <img src={url} alt={image.original_filename} className="max-w-full max-h-[60vh] object-contain p-4" /> : <div className="text-white/20 text-6xl">🖼️</div>}
        </div>
        <div className="w-72 border-l border-white/5 p-6 flex flex-col gap-5 overflow-y-auto">
          <div className="flex items-start justify-between">
            <div>
              <p className="font-bold text-white text-sm truncate max-w-[180px]">{image.original_filename}</p>
              <div className="flex items-center gap-1.5 mt-1">
                <div className={`w-1.5 h-1.5 rounded-full ${STATUS_DOT[image.status]}`} />
                <p className="text-xs text-white/50">{STATUS_TXT[image.status]}</p>
              </div>
            </div>
            <button onClick={onClose} className="text-white/30 hover:text-white text-2xl">×</button>
          </div>

          {image.width && (
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div className="bg-white/5 rounded-xl p-3"><p className="text-white/30 text-xs">Dimensões</p><p className="text-white font-semibold text-sm mt-0.5">{image.width}×{image.height}</p></div>
              <div className="bg-white/5 rounded-xl p-3"><p className="text-white/30 text-xs">Arquivo</p><p className="text-white font-semibold text-sm mt-0.5">{image.file_size_kb}KB</p></div>
            </div>
          )}

          {image.status === 'done' && (
            <div>
              <p className="text-xs text-white/30 uppercase tracking-widest mb-2">Versão</p>
              <div className="flex flex-wrap gap-1.5">
                {(['original', 'thumbnail', 'medium', 'large'] as const).map(s => (
                  <button key={s} onClick={() => setTab(s)}
                    className={`text-xs px-2.5 py-1 rounded-lg transition ${tab === s ? 'bg-violet-600 text-white' : 'bg-white/5 text-white/40 hover:bg-white/10'}`}>{s}</button>
                ))}
                {image.no_bg_url && (
                  <button onClick={() => setTab('no_bg')}
                    className={`text-xs px-2.5 py-1 rounded-lg transition ${tab === 'no_bg' ? 'bg-fuchsia-600 text-white' : 'bg-white/5 text-white/40 hover:bg-white/10'}`}>sem fundo</button>
                )}
              </div>
            </div>
          )}

          {image.operations?.length > 0 && (
            <div>
              <p className="text-xs text-white/30 uppercase tracking-widest mb-2">Operações aplicadas</p>
              <div className="flex flex-col gap-1.5">
                {image.operations.map(op => (
                  <div key={op} className="text-xs bg-violet-500/10 text-violet-400 border border-violet-500/20 px-2.5 py-1.5 rounded-lg">✓ {OP_LABELS[op] ?? op}</div>
                ))}
              </div>
            </div>
          )}

          {image.error_message && <p className="text-red-400 text-xs bg-red-500/10 p-3 rounded-lg">{image.error_message}</p>}

          <div className="flex flex-col gap-2 mt-auto pt-4">
            {url && <a href={url} download target="_blank" rel="noreferrer" className="text-center text-sm bg-violet-600 hover:bg-violet-500 text-white px-4 py-2.5 rounded-xl transition font-semibold">↓ Download</a>}
            <button onClick={handleDelete} className="text-sm bg-white/5 hover:bg-red-500/20 hover:text-red-400 text-white/40 px-4 py-2.5 rounded-xl transition">Deletar</button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function Home() {
  const [images, setImages] = useState<ImageRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [dragging, setDragging] = useState(false)
  const [options, setOptions] = useState<ProcessingOptions>(DEFAULT_OPTIONS)
  const [previewFile, setPreviewFile] = useState<File | null>(null)
  const [previewURL, setPreviewURL] = useState<string | null>(null)
  const [selectedImage, setSelectedImage] = useState<ImageRecord | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    api.get<ImageRecord[]>('/images/').then(({ data }) => setImages(data)).finally(() => setLoading(false))
  }, [])

  function setOpt<K extends keyof ProcessingOptions>(key: K, value: ProcessingOptions[K]) {
    setOptions(prev => ({ ...prev, [key]: value }))
  }

  function onFilePicked(file: File) {
    if (!file.type.startsWith('image/')) return
    setPreviewFile(file)
    setPreviewURL(URL.createObjectURL(file))
  }

  async function handleUpload() {
    if (!previewFile || uploading) return
    setUploading(true)

    const params = new URLSearchParams({
      remove_bg: String(options.remove_bg),
      auto_enhance: String(options.auto_enhance),
      brightness: String(options.brightness),
      contrast: String(options.contrast),
      saturation: String(options.saturation),
      sharpness: String(options.sharpness),
      output_format: options.output_format,
    })
    if (options.custom_width) params.append('custom_width', options.custom_width)
    if (options.custom_height) params.append('custom_height', options.custom_height)

    try {
      const form = new FormData()
      form.append('file', previewFile)
      const { data } = await api.post<ImageRecord>(`/images/upload?${params}`, form)
      setImages(prev => [data, ...prev])
      setPreviewFile(null)
      setPreviewURL(null)
      setOptions(DEFAULT_OPTIONS)
    } catch (err: any) {
      alert(err.response?.data?.detail ?? 'Erro no upload.')
    } finally {
      setUploading(false)
    }
  }

  function onDrop(e: React.DragEvent) {
    e.preventDefault()
    setDragging(false)
    const file = e.dataTransfer.files[0]
    if (file) onFilePicked(file)
  }

  function onDeleted(id: string) {
    setImages(prev => prev.filter(i => i.id !== id))
    if (selectedImage?.id === id) setSelectedImage(null)
  }

  function onUpdated(img: ImageRecord) {
    setImages(prev => prev.map(i => i.id === img.id ? img : i))
    if (selectedImage?.id === img.id) setSelectedImage(img)
  }

  const cssFilter = buildCSSFilter(options)
  const done = images.filter(i => i.status === 'done').length
  const processing = images.filter(i => ['processing', 'pending'].includes(i.status)).length

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white flex flex-col">
      {/* Top bar */}
      <header className="border-b border-white/5 px-8 py-4 flex items-center justify-between sticky top-0 z-10 bg-[#0a0a0f]/90 backdrop-blur-sm">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-500 to-fuchsia-600 flex items-center justify-center text-sm font-black">IP</div>
          <span className="font-black text-lg tracking-tight">Image<span className="text-violet-400">Processor</span></span>
        </div>
        <div className="flex items-center gap-6 text-sm">
          <span className="text-white/30">{images.length} imagens</span>
          <span className="text-green-400 font-semibold">{done} processadas</span>
          {processing > 0 && <span className="text-yellow-400 animate-pulse font-semibold">{processing} processando...</span>}
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden" style={{ height: 'calc(100vh - 57px)' }}>

        {/* LEFT: Controls */}
        <aside className="w-64 border-r border-white/5 p-4 flex flex-col gap-4 overflow-y-auto flex-shrink-0">

          {/* Drop zone */}
          <div>
            <p className="text-xs font-bold text-white/30 uppercase tracking-widest mb-2">Imagem</p>
            <div
              onClick={() => inputRef.current?.click()}
              onDragOver={e => { e.preventDefault(); setDragging(true) }}
              onDragLeave={() => setDragging(false)}
              onDrop={onDrop}
              className={`border-2 border-dashed rounded-xl h-28 flex flex-col items-center justify-center gap-2 cursor-pointer transition-all
                ${dragging ? 'border-violet-500 bg-violet-500/10' : 'border-white/10 hover:border-violet-500/40'}`}
            >
              <input ref={inputRef} type="file" accept="image/*" className="hidden"
                onChange={e => e.target.files?.[0] && onFilePicked(e.target.files[0])} />
              <div className="text-2xl">{previewFile ? '✅' : '🖼️'}</div>
              <p className="text-xs text-white/40 text-center">{previewFile ? previewFile.name.slice(0, 20) + '…' : 'Arraste ou clique'}</p>
            </div>
          </div>

          {/* Format */}
          <div>
            <p className="text-xs font-bold text-white/30 uppercase tracking-widest mb-2">Formato de saída</p>
            <div className="grid grid-cols-3 gap-1">
              {(['JPEG', 'PNG', 'WEBP'] as const).map(fmt => (
                <button key={fmt} onClick={() => setOpt('output_format', fmt)}
                  className={`py-1.5 rounded-lg text-xs font-bold transition ${options.output_format === fmt ? 'bg-violet-600 text-white' : 'bg-white/5 text-white/40 hover:bg-white/10'}`}>
                  {fmt}
                </button>
              ))}
            </div>
          </div>

          {/* Dimensions */}
          <div>
            <p className="text-xs font-bold text-white/30 uppercase tracking-widest mb-2">Dimensões (px)</p>
            <div className="grid grid-cols-2 gap-2">
              <input type="number" placeholder="Largura" value={options.custom_width}
                onChange={e => setOpt('custom_width', e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-lg px-2 py-1.5 text-xs text-white placeholder-white/15 focus:outline-none focus:border-violet-500 transition" />
              <input type="number" placeholder="Altura" value={options.custom_height}
                onChange={e => setOpt('custom_height', e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-lg px-2 py-1.5 text-xs text-white placeholder-white/15 focus:outline-none focus:border-violet-500 transition" />
            </div>
          </div>

          {/* Sliders */}
          <div>
            <p className="text-xs font-bold text-white/30 uppercase tracking-widest mb-3">Ajustes</p>
            <div className="space-y-3">
              <Slider label="Brilho" icon="☀️" value={options.brightness} min={0.2} max={2} step={0.05} onChange={v => setOpt('brightness', v)} />
              <Slider label="Contraste" icon="◑" value={options.contrast} min={0.2} max={2} step={0.05} onChange={v => setOpt('contrast', v)} />
              <Slider label="Saturação" icon="🎨" value={options.saturation} min={0} max={2} step={0.05} onChange={v => setOpt('saturation', v)} />
              <Slider label="Nitidez" icon="🔍" value={options.sharpness} min={0} max={3} step={0.1} onChange={v => setOpt('sharpness', v)} />
            </div>
          </div>

          {/* IA */}
          <div>
            <p className="text-xs font-bold text-white/30 uppercase tracking-widest mb-3">IA</p>
            <div className="space-y-3">
              <Toggle label="Auto-melhoria" desc="Nitidez e contraste automáticos" value={options.auto_enhance} onChange={v => setOpt('auto_enhance', v)} />
              <Toggle label="Remover fundo" desc="U2Net via rembg" value={options.remove_bg} onChange={v => setOpt('remove_bg', v)} />
            </div>
          </div>

          <button onClick={() => setOptions(DEFAULT_OPTIONS)} className="text-xs text-white/20 hover:text-white/50 transition">↺ Resetar</button>
        </aside>

        {/* CENTER: Live Preview */}
        <div className="w-80 border-r border-white/5 flex flex-col flex-shrink-0">
          <div className="border-b border-white/5 px-4 py-3 flex items-center justify-between">
            <p className="text-xs font-bold text-white/40 uppercase tracking-widest">Preview ao vivo</p>
            {previewURL && (
              <span className="text-xs text-violet-400 font-semibold">CSS filters aplicados</span>
            )}
          </div>

          <div className="flex-1 flex flex-col items-center justify-center p-4 bg-[#0a0a0f] relative overflow-hidden"
            style={{ backgroundImage: 'radial-gradient(circle, #111120 1px, transparent 1px)', backgroundSize: '18px 18px' }}>

            {previewURL ? (
              <>
                <div className="relative w-full flex flex-col items-center gap-3">

                  {/* Preview COM ajustes + dimensões */}
                  <div className="w-full">
                    <p className="text-xs text-white/30 text-center mb-2 uppercase tracking-widest">Com ajustes</p>
                    <div
                      className="rounded-xl overflow-hidden border border-white/10 flex items-center justify-center bg-[#0a0a0f]"
                      style={{
                        // simulate custom size by constraining the container
                        maxWidth: options.custom_width ? `${Math.min(parseInt(options.custom_width), 280)}px` : '100%',
                        maxHeight: options.custom_height ? `${Math.min(parseInt(options.custom_height), 220)}px` : '220px',
                        margin: '0 auto',
                        transition: 'max-width 0.2s ease, max-height 0.2s ease',
                        // checkerboard when remove_bg is active
                        backgroundImage: options.remove_bg
                          ? 'linear-gradient(45deg, #2a2a2a 25%, transparent 25%), linear-gradient(-45deg, #2a2a2a 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #2a2a2a 75%), linear-gradient(-45deg, transparent 75%, #2a2a2a 75%)'
                          : undefined,
                        backgroundSize: options.remove_bg ? '12px 12px' : undefined,
                        backgroundPosition: options.remove_bg ? '0 0, 0 6px, 6px -6px, -6px 0px' : undefined,
                      }}
                    >
                      <img
                        src={previewURL}
                        alt="preview"
                        className="w-full h-full object-contain"
                        style={{
                          filter: cssFilter,
                          transition: 'filter 0.1s ease',
                          // remove_bg simulation: punch out a rough center (CSS mask approximation)
                          mixBlendMode: options.remove_bg ? 'multiply' : 'normal',
                          maxHeight: '220px',
                        }}
                      />
                    </div>
                  </div>

                  {/* Original */}
                  <div className="w-full">
                    <p className="text-xs text-white/30 text-center mb-2 uppercase tracking-widest">Original</p>
                    <div className="rounded-xl overflow-hidden border border-white/5 opacity-50 max-h-24 flex items-center justify-center">
                      <img src={previewURL} alt="original" className="w-full object-contain max-h-24" />
                    </div>
                  </div>
                </div>

                {/* Active effects badges */}
                <div className="mt-3 w-full flex flex-wrap gap-1.5">
                  {options.auto_enhance && (
                    <span className="text-xs bg-violet-500/20 text-violet-300 border border-violet-500/30 px-2 py-1 rounded-lg">✨ Auto-melhoria ativa</span>
                  )}
                  {options.remove_bg && (
                    <span className="text-xs bg-fuchsia-500/20 text-fuchsia-300 border border-fuchsia-500/30 px-2 py-1 rounded-lg">✂️ Fundo será removido no servidor</span>
                  )}
                  {(options.custom_width || options.custom_height) && (
                    <span className="text-xs bg-blue-500/20 text-blue-300 border border-blue-500/30 px-2 py-1 rounded-lg">
                      📐 {options.custom_width || '?'}×{options.custom_height || '?'}px
                    </span>
                  )}
                  {[options.brightness, options.contrast, options.saturation, options.sharpness].some(v => v !== 1.0) && (
                    <span className="text-xs bg-green-500/10 text-green-400 border border-green-500/20 px-2 py-1 rounded-lg">🎛 Filtros ajustados</span>
                  )}
                </div>

                {/* Stats grid */}
                <div className="mt-2 w-full grid grid-cols-4 gap-1">
                  {[
                    { label: 'Brilho', val: options.brightness },
                    { label: 'Contraste', val: options.contrast },
                    { label: 'Saturação', val: options.saturation },
                    { label: 'Nitidez', val: options.sharpness },
                  ].map(({ label, val }) => (
                    <div key={label} className={`rounded-lg px-1.5 py-1.5 text-center border transition ${val !== 1.0 ? 'bg-violet-500/10 border-violet-500/20' : 'bg-white/5 border-transparent'}`}>
                      <p className="text-[10px] text-white/30 truncate">{label}</p>
                      <p className={`text-xs font-mono font-bold ${val !== 1.0 ? 'text-violet-400' : 'text-white/20'}`}>{val.toFixed(1)}</p>
                    </div>
                  ))}
                </div>

                {/* Upload button */}
                <button
                  onClick={handleUpload}
                  disabled={uploading}
                  className="mt-3 w-full bg-violet-600 hover:bg-violet-500 disabled:opacity-50 text-white font-bold py-3 rounded-xl transition flex items-center justify-center gap-2">
                  {uploading
                    ? <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Processando...</>
                    : '⬆ Processar e salvar'}
                </button>
              </>
            ) : (
              <div className="text-center text-white/20">
                <div className="text-5xl mb-3">👈</div>
                <p className="text-sm">Selecione uma imagem</p>
                <p className="text-xs mt-1 text-white/10">O preview aparece aqui enquanto você ajusta os controles</p>
              </div>
            )}
          </div>
        </div>

        {/* RIGHT: Gallery */}
        <main className="flex-1 p-5 overflow-y-auto">
          <p className="text-xs font-bold text-white/30 uppercase tracking-widest mb-4">Galeria</p>
          {loading ? (
            <div className="text-white/20 text-sm text-center py-20">Carregando...</div>
          ) : images.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 gap-3 text-white/20">
              <div className="text-4xl">📂</div>
              <p className="text-sm">Nenhuma imagem ainda</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 xl:grid-cols-3 gap-3">
              {images.map(img => (
                <ImageCard key={img.id} image={img} onDeleted={onDeleted} onUpdated={onUpdated} onClick={() => setSelectedImage(img)} />
              ))}
            </div>
          )}
        </main>
      </div>

      {selectedImage && <ImageModal image={selectedImage} onClose={() => setSelectedImage(null)} onDeleted={onDeleted} />}
    </div>
  )
}
