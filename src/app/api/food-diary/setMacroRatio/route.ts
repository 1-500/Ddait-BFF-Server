import { NextResponse, NextRequest } from 'next/server'
import { cookies } from 'next/headers'
import { createClient } from '@/utils/supabase/server'

export async function POST(req: NextRequest) {
  try {
    const cookieStore = cookies()
    const supabase = createClient(cookieStore)
    const { searchParams } = new URL(req.url)
    const date = searchParams.get('date')

    const { userWeight, carbRatio, proteinRatio, fatRatio, total_calories } = await req.json()
    const userId = req.headers.get('X-User-Id')

    const memberResult = await supabase.from('food_diary').select('*').eq('member_id', userId)

    if (!memberResult.data?.length) {
      const foodDiaryResult = await supabase.from('food_diary').insert({
        carb_ratio: carbRatio,
        protein_ratio: proteinRatio,
        fat_ratio: fatRatio,
        total_calories: total_calories,
        member_id: userId,
        current_weight: userWeight,
      })
      if (foodDiaryResult.error) {
        return NextResponse.json({
          message: '데이터를 넣는데 실패하였습니다!',
          status: foodDiaryResult.status,
        })
      }
    } else {
      const dateObj = new Date(date)
      const startOfDay = new Date(dateObj.setHours(0, 0, 0, 0) + 9 * 60 * 60 * 1000).toISOString()
      const endOfDay = new Date(dateObj.setHours(23, 59, 59, 999) + 9 * 60 * 60 * 1000).toISOString()
      // day .js로 변경?

      await supabase
        .from('food_diary')
        .update({
          carb_ratio: carbRatio,
          protein_ratio: proteinRatio,
          fat_ratio: fatRatio,
          total_calories: total_calories,
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

//sdf
