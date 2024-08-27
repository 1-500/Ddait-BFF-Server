import { createClient } from '@/utils/supabase/server'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

export async function GET() {
  console.log(process.env.NEXT_PUBLIC_SUPABASE_URL)
  return NextResponse.json({
    status: '200',
    message: 'Hello world !',
  })
}
