import { NextResponse, NextRequest } from 'next/server'
import { cookies } from 'next/headers'
import { createClient } from '@/utils/supabase/server'
import { getCurrentKoreanTime } from '@/utils/shared/date'

export async function POST(req: NextRequest) {
  try {
    const cookieStore = cookies()
    const supabase = createClient(cookieStore)
    const { searchParams } = new URL(req.url)
    const date = searchParams.get('date')
    const { userWeight } = await req.json()
    const userId = req.headers.get('X-User-Id')
    if (date === null) {
      return NextResponse.json({
        error: '날짜를 입력해주세요',
        status: 400,
      })
    }

    const { data: foodDiarySearchResult, error: foodDiarySearchError } = await supabase
      .from('food_diary')
      .select('*')
      .eq('member_id', userId)
      .eq('date', date)
      .single()

    if (foodDiarySearchError) {
      return NextResponse.json({
        error: foodDiarySearchError.message,
        status: foodDiarySearchError.code,
      })
    }

    if (!foodDiarySearchResult) {
      const foodDiaryInsertResult = await supabase.from('food_diary').insert({
        member_id: userId,
        current_weight: userWeight,
      })
      if (foodDiaryInsertResult.error) {
        return NextResponse.json({
          error: foodDiaryInsertResult.error.message,
          status: foodDiaryInsertResult.status,
        })
      } else {
        return NextResponse.json({
          message: '데이터가 성공적으로 반영되었습니다!',
          status: 200,
        })
      }
    } else {
      await supabase
        .from('food_diary')
        .update({
          member_id: userId,
          current_weight: userWeight,
          edited_at: getCurrentKoreanTime(),
        })
        .eq('member_id', userId)
        .eq('date', date)
    }

    return NextResponse.json({
      message: '데이터가 성공적으로 반영되었습니다!',
      status: 200,
    })
  } catch (error) {
    return NextResponse.json({ message: error })
  }
}
