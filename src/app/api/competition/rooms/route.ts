import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/client'
import { count } from 'console'

// 전체 경쟁방 목록 조회
export async function GET(req: NextRequest) {
  try {
    const supabase = createClient()
    const { data: allRooms, error } = await supabase
      .from('competition_room')
      .select('*')
      .order('start_date', { ascending: false })

    if (error) {
      console.error('supabase error', error)
      return NextResponse.json({ message: '경쟁방 목록 조회 중 오류 발생' }, { status: 400 })
    }

    return NextResponse.json(
      {
        message: '전체 경쟁방 목록 조회 성공',
        data: allRooms,
      },
      { status: 200 },
    )
  } catch (error) {
    return NextResponse.json({ message: error.message || '예상치 못한 오류가 발생했습니다.' }, { status: 500 })
  }
}

// 경쟁방 생성
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

    const { data: roomData } = await supabase
      .from('competition_room')
      .insert([
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
      ])
      .select()
      .single() // 단일 객체로 반환

    const responseData = {
      room_id: roomData.id,
      title: roomData.title,
    }
    return NextResponse.json({ message: '경쟁방이 성공적으로 생성되었습니다.', data: responseData }, { status: 201 })
  } catch (error) {
    return NextResponse.json({ message: error.message || '예상치 못한 오류가 발생했습니다.' }, { status: 500 })
  }
}