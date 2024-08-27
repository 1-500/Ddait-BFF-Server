import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/client'

// 내 경쟁방 목록 조회
export async function GET(req: NextRequest) {
  try {
    const supabase = createClient()
    const url = new URL(req.url)
    const userId = url.searchParams.get('userId')

    if (!userId) {
      return NextResponse.json({ message: 'userId가 필요합니다' }, { status: 400 })
    }

    const { data: userRooms, error } = await supabase
      .from('competition_record')
      .select(
        `
        competition_room:competition_room_id(
          id, title, max_members, competition_type, competition_theme, start_date, end_date, is_private, smartwatch, current_members:competition_record(count)
        )
      `,
      )
      .eq('member_id', userId)

    if (error) {
      console.error('supabase error', error)
      return NextResponse.json({ message: '경쟁방 목록 조회 중 오류 발생' }, { status: 400 })
    }

    const userRoomsData = userRooms.map((room) => ({
      ...room.competition_room,
      current_members: parseInt(room.competition_room.current_members[0].count, 10),
    }))

    return NextResponse.json(
      {
        message: `${userId}번 유저의 경쟁방 목록을 성공적으로 조회했습니다.`,
        data: userRoomsData,
      },
      { status: 200 },
    )
  } catch (error) {
    return NextResponse.json({ message: error.message || '예상치 못한 오류가 발생했습니다.' }, { status: 500 })
  }
}
