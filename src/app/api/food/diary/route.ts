import { NextResponse, NextRequest } from 'next/server'
import { cookies } from 'next/headers'
import { createClient } from '@/utils/supabase/server'

export async function GET(req: NextRequest) {
  const cookieStore = cookies()
  const supabase = createClient(cookieStore)
  const userId = req.headers.get('X-User-Id')
  const { searchParams } = new URL(req.url)
  const date = searchParams.get('date')

  try {
    const { data: foodDiaryResult } = await supabase
      .from('food_diary')
      .select('*')
      .eq('member_id', userId)
      .eq('date', date)
      .single()
    let userInfo = {}
    if (!foodDiaryResult) {
      return NextResponse.json({
        message: '데이터가 존재하지 않습니다!',
        status: 400,
      })
    } else {
      userInfo = {
        carbRatio: foodDiaryResult.carb_ratio,
        proteinRatio: foodDiaryResult.protein_ratio,
        fatRatio: foodDiaryResult.fat_ratio,
        userWeight: foodDiaryResult.current_weight,
        totalCalories: foodDiaryResult.total_calories,
      }
    }

    return NextResponse.json({
      data: userInfo,
      message: '데이터를 정상적으로 조회하였습니다!',
      status: 200,
    })
  } catch (error) {
    return NextResponse.json({
      message: '서버에서 오류가 발생했습니다.',
      error: error.message,
      status: 500,
    })
  }
}
