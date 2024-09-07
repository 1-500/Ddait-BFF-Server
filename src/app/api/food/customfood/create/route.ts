import { NextResponse, NextRequest } from 'next/server'
import { cookies } from 'next/headers'
import { createClient } from '@/utils/supabase/server'
import { getEndOfDay, getStartOfDay } from '@/utils/shared/date'

export async function POST(req: NextRequest) {
  try {
    const cookieStore = cookies()
    const supabase = createClient(cookieStore)
    const userId = req.headers.get('X-User-Id')
    const { food } = await req.json()

    const { data: insertResult } = await supabase
      .from('food_info')
      .insert({
        name: food.name,
        carbs: food.carbs,
        calories: food.calories,
        protein: food.protein,
        fat: food.fat,
        serving_size: food.serving_size,
        created_user: userId,
      })
      .select('*')
      .single()
    if (insertResult) {
      return NextResponse.json({
        message: '나만의 음식을 생성 하였습니다!',
        status: 200,
      })
    } else {
      return NextResponse.json({
        message: '나만의 음식을 생성 하지 못했습니다!',
        status: 400,
      })
    }
  } catch (error) {
    return NextResponse.json({ error: error })
  }
}

//sdf
