import { NextResponse, NextRequest } from 'next/server'
import { cookies } from 'next/headers'
import { createClient } from '@/utils/supabase/server'
import { getEndOfDay, getStartOfDay } from '@/utils/shared/date'

export async function POST(req: NextRequest) {
  try {
    const cookieStore = cookies()
    const supabase = createClient(cookieStore)
    const userId = req.headers.get('X-User-Id')
    const { foodItems, date } = await req.json()

    console.log(foodItems)

    return NextResponse.json({
      message: '식단 일지에 기록 하였습니다!',
      status: 200,
    })
  } catch (error) {
    return NextResponse.json({ error: error })
  }
}

//sdf
