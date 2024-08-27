import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/client'

export async function POST(req: NextRequest) {
  try {
    const supabase = createClient()

    const {
      title,
      max_members,
      competition_type,
      competition_theme,
      start_date,
      end_date,
      is_private,
      smartwatch,
      user_id,
    } = await req.json()

    const { data: roomData, error: roomError } = await supabase.from('competition_room').insert([
      {
        title,
        max_members,
        competition_type,
        competition_theme,
        start_date,
        end_date,
        is_private,
        smartwatch,
      },
    ]).select().single()  // 단일 객체로 반환

    if (roomError) {
      return NextResponse.json({ message: `경쟁방 생성 중 오류 발생: ${roomError.message}` }, { status: 400 })
    }
    const responseData = {
      room_id: roomData.id, 
      title: roomData.title,
    }
    return NextResponse.json({ message: '경쟁방이 성공적으로 생성되었습니다.', data: responseData }, { status: 201 })
  } catch (error) {
    return NextResponse.json({ message: error.message || '예상치 못한 오류가 발생했습니다.' }, { status: 500 })
  }
}