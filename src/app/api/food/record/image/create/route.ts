import { NextResponse, NextRequest } from 'next/server'
import { cookies } from 'next/headers'
import { createClient } from '@/utils/supabase/server'

export async function POST(req: NextRequest) {
  try {
    const cookieStore = cookies()
    const supabase = createClient(cookieStore)

    const { file_url, food_record_id } = await req.json()

    const { error } = await supabase.from('food_record_images').insert({
      file_url,
      food_record_id,
    })

    if (error) {
      return NextResponse.json({ message: error.message, status: error.message })
    }

    return NextResponse.json({ status: 200, message: '이미지를 성공적으로 추가하였습니다' })
  } catch (error) {
    console.log(error)
    return NextResponse.json({ error: error })
  }
}
