import { createClient } from '@/utils/supabase/server'
import { cookies } from 'next/headers'

import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest) {
  try {
    const cookieStore = cookies()
    const supabase = createClient(cookieStore)

    const { searchParams } = new URL(req.url)
    const email = searchParams.get('social_email')

    const searchResult = await supabase.from('social_login').select('*').eq('email', email).single()

    if (searchResult.error) {
      return NextResponse.json(searchResult.error.message)
    }

    return NextResponse.json(searchResult.data.user_level)
  } catch (error) {
    console.log(error)
    return NextResponse.json({ message: error })
  }
}
