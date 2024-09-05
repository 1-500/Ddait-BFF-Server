import { NextResponse, NextRequest } from 'next/server'
import { cookies } from 'next/headers'
import { createClient } from '@/utils/supabase/server'
import { getEndOfDay, getStartOfDay } from '@/utils/shared/date'

export async function POST(req: NextRequest) {
  try {
    const cookieStore = cookies()
    const supabase = createClient(cookieStore)
    const userId = req.headers.get('X-User-Id')

    const memberResult = await supabase.from('food_diary').insert({
      member_id: userId,
    })
    console.log(memberResult)

    return NextResponse.json({
      message: '오늘의 식단 일지가 생성되었습니다.',
      status: 200,
    })
  } catch (error) {
    return NextResponse.json({ message: error })
  }
}

//sdf
