import { NextRequest, NextResponse } from 'next/server'
import { requireRole } from '@/lib/auth'
import { handleRouteError } from '@/lib/errors'
import { writeFile } from 'fs/promises'
import path from 'path'

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']
const MAX_SIZE = 5 * 1024 * 1024 // 5 MB

export async function POST(req: NextRequest) {
  try {
    await requireRole('ADMIN', 'TUTOR')

    const formData = await req.formData()
    const file = formData.get('file') as File | null

    if (!file) return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json({ error: 'Only JPEG, PNG, WebP and GIF are allowed' }, { status: 400 })
    }
    if (file.size > MAX_SIZE) {
      return NextResponse.json({ error: 'File must be under 5 MB' }, { status: 400 })
    }

    const ext = file.name.split('.').pop() ?? 'jpg'
    const filename = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`
    const dest = path.join(process.cwd(), 'public', 'uploads', 'courses', filename)

    const bytes = await file.arrayBuffer()
    await writeFile(dest, Buffer.from(bytes))

    const url = `/uploads/courses/${filename}`
    return NextResponse.json({ url }, { status: 201 })
  } catch (e) {
    return handleRouteError(e)
  }
}
