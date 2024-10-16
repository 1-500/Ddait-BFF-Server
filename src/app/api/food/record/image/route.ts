import { NextResponse, NextRequest } from 'next/server'
import { cookies } from 'next/headers'
import { createClient } from '@/utils/supabase/server'

export async function GET(req: NextRequest) {
  try {
    const cookieStore = cookies()
    const supabase = createClient(cookieStore)
    const { searchParams } = new URL(req.url)
    const id = searchParams.get('id')

    console.log(id)
    if (!id) {
      console.log(id)
      return NextResponse.json({ status: 200, message: '조회할 이미지가 없습니다.' })
    }

    const { data: food_record_images, error } = await supabase
      .from('food_record_images')
      .select()
      .eq('food_record_id', id)

    if (error) {
      return NextResponse.json({ status: error.code, message: error.message })
    }

    const foodRecordImageList = []
    for (const image of food_record_images) {
      const { data } = supabase.storage.from('food_record_images').getPublicUrl(image.file_url)
      foodRecordImageList.push(data.publicUrl)
    }
    if (!foodRecordImageList.length) {
      return NextResponse.json({ status: 200, data: foodRecordImageList, message: '가져올이미지가 존재하지않습니다' })
    } else {
      return NextResponse.json({ status: 200, data: foodRecordImageList, message: '이미지 불러오기 성공!' })
    }
  } catch (error: any) {
    return NextResponse.json({ status: 400, message: error.message })
  }
}
