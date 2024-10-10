import { NextResponse, NextRequest } from 'next/server'
import { cookies } from 'next/headers'
import { createClient } from '@/utils/supabase/server'

export async function POST(req: NextRequest) {
  try {
    const cookieStore = cookies()
    const supabase = createClient(cookieStore)

    const { images, food_record_id } = await req.json()

    for (const path of images) {
      await supabase.from('food_record_images').delete().eq('food_record_id', food_record_id).eq('file_url', path)
    }

    const { error } = await supabase.storage.from('food_record_images').remove(images)

    if (error) {
      return NextResponse.json({ message: error.message, status: error.message })
    }

    return NextResponse.json({ status: 200, message: '이미지를 성공적으로 삭제 하였습니다' })
  } catch (error) {
    console.log(error)
    return NextResponse.json({ error: error })
  }
}
