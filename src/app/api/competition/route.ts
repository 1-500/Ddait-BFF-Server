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
    
    // member_id의 유효성 확인 (로그인 후 유저데이터 저장이 잘못된 경우 대비)
    const { data: memberData, error: memberError } = await supabase.from('member').select('id').eq('id', user_id).single()
    if (memberError || !memberData) {
      return NextResponse.json({ message: '유효하지 않은 사용자 ID입니다.' }, { status: 400 })
    }

    const { data: entryData, error: entryError } = await supabase.from('competition_record').insert([
      {
        member_id: user_id,
        competition_room_id: roomData.id,
        rank: 1, // 생성하는 사람이므로 1
      },
    ]).select().single()

    if (entryError) {
      return NextResponse.json({ message: `경쟁방에 유저 ${user_id}가 입장하는데 오류가 발생했습니다: ${entryError.message}` }, { status: 400 })
    }

    const responseData = {
      room_id: roomData.id, 
      title: roomData.title,
      user: entryData.member_id
    }

    return NextResponse.json({ message: '경쟁방이 성공적으로 생성되었습니다.', data: responseData }, { status: 201 })
  } catch (error) {
    return NextResponse.json({ message: error.message || '예상치 못한 오류가 발생했습니다.' }, { status: 500 })
  }
}