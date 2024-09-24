import { NextResponse, NextRequest } from 'next/server'
import { cookies } from 'next/headers'
import { createClient } from '@/utils/supabase/server'

export async function GET(req: NextRequest) {
  try {
    const cookieStore = cookies()
    const supabase = createClient(cookieStore)

    const userId = req.headers.get('X-User-Id')

    const result = await supabase.from('food_info').select('*').eq('created_user', userId)

    if (result.error || result.data.length === 0) {
      return NextResponse.json({
        message: '데이터가 존재하지 않습니다',
        status: result.status.toFixed(),
      })
    }
    const memberCustomFood = result.data
    return NextResponse.json({
      data: memberCustomFood,
      message: '데이터를 정상적으로 조회하였습니다!',
      status: 200,
    })
  } catch (error) {
    return NextResponse.json({ error: error.message })
  }
}
