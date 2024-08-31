import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/client'
import { cookies } from 'next/headers'

// 내 경쟁방 목록 조회
export async function GET(req: NextRequest) {
  try {
    const cookieStore = cookies()
    const supabase = createClient(cookieStore)

    // 토큰 확인 로직 추가
    const authHeader = req.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ message: '인증 토큰이 없거나 형식이 잘못되었습니다.' }, { status: 401 })
    }
    const token = authHeader.split(' ')[1]

    // Supabase로 토큰 검증
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser(token)
    if (authError || !user) {
      console.error('Auth error:', authError)
      return NextResponse.json({ message: '유효하지 않은 토큰입니다.' }, { status: 401 })
    }

    // member 테이블에서 현재 사용자의 ID 조회
    const { data: memberData, error: memberError } = await supabase
      .from('member')
      .select('id')
      .eq('email', user.email)
      .single()

    if (memberError || !memberData) {
      console.error('Member fetch error:', memberError)
      return NextResponse.json({ message: '사용자 정보를 찾을 수 없습니다.' }, { status: 404 })
    }

    const currentMemberId = memberData.id

    // 내 경쟁방 목록 조회
    const { data: userRooms, error } = await supabase
      .from('competition_record')
      .select(
        `
        competition_room:competition_room_id(
          id, title, max_members, competition_type, competition_theme, start_date, end_date, is_private, smartwatch, host_id,
          current_members:competition_record(count)
        )
      `,
      )
      .eq('member_id', currentMemberId)

    if (error) {
      console.error('Supabase error', error)
      return NextResponse.json({ message: '경쟁방 목록 조회 중 오류 발생' }, { status: 400 })
    }

    const userRoomsData = userRooms.map((room) => ({
      id: room.competition_room.id,
      title: room.competition_room.title,
      info: {
        max_members: room.competition_room.max_members,
        current_members: parseInt(room.competition_room.current_members[0].count, 10),
        competition_type: room.competition_room.competition_type,
        competition_theme: room.competition_room.competition_theme,
      },
      date: {
        start_date: room.competition_room.start_date,
        end_date: room.competition_room.end_date,
      },
      settings: {
        is_private: room.competition_room.is_private,
        smartwatch: room.competition_room.smartwatch,
      },
      user_status: {
        is_host: room.competition_room.host_id === currentMemberId,
        is_participant: true, // 내 경쟁방 목록이므로 항상 참여자입니다
      },
    }))

    return NextResponse.json(
      {
        message: '내 경쟁방 목록을 성공적으로 조회했습니다.',
        data: userRoomsData,
      },
      { status: 200 },
    )
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json({ message: error.message || '예상치 못한 오류가 발생했습니다.' }, { status: 500 })
  }
}