import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'
import { cookies } from 'next/headers'

export async function GET(req: NextRequest) {
  try {
    const cookieStore = cookies()
    const supabase = createClient(cookieStore)

    const res = await supabase.from('faq').select('*').order('type', { ascending: true })

    if (res.error) {
      return NextResponse.json({ message: res.error.message }, { status: res.status })
    }

    return NextResponse.json({ data: res.data, status: 200 })
  } catch (error) {
    console.log(error)
    return NextResponse.json({ message: error }, { status: 400 })
  }
}
