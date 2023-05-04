export interface ImageRecord {
  id: string
  original_filename: string
  original_url: string
  thumbnail_url: string | null
  medium_url: string | null
  large_url: string | null
  no_bg_url: string | null
  file_size_kb: number | null
  width: number | null
  height: number | null
  status: 'pending' | 'processing' | 'done' | 'error'
  error_message: string | null
  operations: string[]
  created_at: string
}

export interface ProcessingOptions {
  remove_bg: boolean
  auto_enhance: boolean
  custom_width: string
  custom_height: string
  brightness: number
  contrast: number
  saturation: number
  sharpness: number
  output_format: 'JPEG' | 'PNG' | 'WEBP'
}
