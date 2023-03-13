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
