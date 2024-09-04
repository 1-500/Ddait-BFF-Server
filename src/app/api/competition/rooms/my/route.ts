import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/client'
import { cookies } from 'next/headers'

// 내 경쟁방 목록 조회
export async function GET(req: NextRequest) {
  try {
    const cookieStore = cookies()
    const supabase = createClient(cookieStore)

    const userId = req.headers.get('X-User-Id')
    if (!userId) {
      return NextResponse.json({ message: '유저 ID가 필요합니다.' }, { status: 400 })
    }

    // 내 경쟁방 정보 + 참여자 수
    const { data: userRooms, error: fetchMyroomError } = await supabase
      .from('competition_record')
      .select(
        `
        competition_room:competition_room_id(
          id, title, max_members, competition_type, competition_theme, start_date, end_date, is_private, smartwatch, host_id,
          current_members:competition_record(count)
        )
      `,
      )
      .eq('member_id', userId)

    if (fetchMyroomError) {
      return NextResponse.json(
        { message: '경쟁방 목록 조회 중 오류 발생', error: fetchMyroomError.message },
        { status: fetchMyroomError.status },
      )
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
        is_host: room.competition_room.host_id === userId,
        is_participant: true, // 내 경쟁방 목록이니까 항상 참여자
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
    return NextResponse.json({ message: '예상치 못한 오류가 발생했습니다.' }, { status: 500 })
  }
}