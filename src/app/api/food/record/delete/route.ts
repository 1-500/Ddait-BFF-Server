import { NextResponse, NextRequest } from 'next/server'
import { cookies } from 'next/headers'
import { createClient } from '@/utils/supabase/server'
import { getCurrentKoreanTime } from '@/utils/shared/date'

export async function POST(req: NextRequest) {
  try {
    const cookieStore = cookies()
    const supabase = createClient(cookieStore)
    const { searchParams } = new URL(req.url)
    const id = searchParams.get('id')

    const { data: existingData, error: fetchError } = await supabase
      .from('food_record_info')
      .select('*')
      .eq('id', id)
      .single() // 단일 레코드 조회

    if (fetchError) {
      NextResponse.json({
        message: fetchError.message,
        status: fetchError.code,
      })
    }
    if (existingData) {
      const { error, data } = await supabase.from('food_record_info').delete().eq('id', id)
      if (error) {
        return NextResponse.json({
          message: error.message,
          status: error.code,
        })
      } else {
        return NextResponse.json({
          data: existingData,
          message: '데이터를 성공적으로 삭제 하였습니다!',
          status: 200,
        })
      }
    } else {
      return NextResponse.json({
        message: '삭제할 데이터가 존재하지 않습니다!',
        status: 400,
      })
    }
  } catch (error) {
    return NextResponse.json({ error: error })
  }
}

//sdf
