import { createClient } from '@/utils/supabase/server'
import { cookies } from 'next/headers'
import { NextResponse, NextRequest } from 'next/server'

export async function GET(req: NextRequest) {
  const cookieStore = cookies()
  const supabase = createClient(cookieStore)
  const userId = req.headers.get('X-User-Id')
  console.log(userId, 'home')
  return NextResponse.json({
    status: '200',
    message: 'Hello world !',
  })
}
