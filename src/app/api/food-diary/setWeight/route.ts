import { NextResponse, NextRequest } from 'next/server'
import { cookies } from 'next/headers'
import { createClient } from '@/utils/supabase/server'
import { getEndOfDay, getStartOfDay } from '@/utils/shared/date'

export async function POST(req: NextRequest) {
  try {
    const cookieStore = cookies()
    const supabase = createClient(cookieStore)
    const { searchParams } = new URL(req.url)
    const date = searchParams.get('date')
    const { userWeight } = await req.json()
    const userId = req.headers.get('X-User-Id')
    const memberResult = await supabase.from('food_diary').select('*').eq('member_id', userId)
    if (date === null) {
      return NextResponse.json({
        error: '날짜를 입력해주세요',
        status: 400,
      })
    }
    if (!memberResult.data?.length) {
      const foodDiaryResult = await supabase.from('food_diary').insert({
        member_id: userId,
        current_weight: userWeight,
      })
      if (foodDiaryResult.error) {
        return NextResponse.json({
          error: foodDiaryResult.error.message,
          status: foodDiaryResult.status,
        })
      }
    } else {
      const startOfDay = getStartOfDay(date)
      const endOfDay = getEndOfDay(date)

      await supabase
        .from('food_diary')
        .update({
          member_id: userId,
          current_weight: userWeight,
        })
        .gte('created_at', startOfDay)
        .lt('created_at', endOfDay)
    }

    return NextResponse.json({
      message: '데이터를 삽입 하였습니다!',
      status: 200,
    })
  } catch (error) {
    return NextResponse.json({ message: error })
  }
}
