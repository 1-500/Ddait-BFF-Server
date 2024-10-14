import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/client'
import { cookies } from 'next/headers'

// 경쟁방 상세 조회
export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const cookieStore = cookies()
    const supabase = createClient(cookieStore)

    const userId = req.headers.get('X-User-Id')
    if (!userId) {
      return NextResponse.json({ message: '유저 ID가 필요합니다.' }, { status: 400 })
    }

    const { id } = params

    // 경쟁방 정보 + 참여자 수
    const { data: roomDetail, error: roomDetailError } = await supabase
      .from('competition_room')
      .select(
        `
        *,
        current_members: competition_record(count),
        host_info: host_id(id, nickname, email)
      `,
      )
      .eq('id', id)
      .single()

    if (roomDetailError) {
      return NextResponse.json(
        { message: '경쟁방 정보 조회 중 오류 발생', error: roomDetailError.message },
        { status: roomDetailError.status },
      )
    }

    if (!roomDetail) {
      return NextResponse.json({ message: '해당 경쟁방을 찾을 수 없습니다.' }, { status: 404 })
    }

    // 참여자 id 조회
    const { data: members, error: membersError } = await supabase
      .from('competition_record')
      .select('member_id')
      .eq('competition_room_id', id)

    if (membersError) {
      return NextResponse.json(
        { message: '참여자 목록 조회 중 오류 발생', error: membersError.message },
        { status: 400 },
      )
    }

    const memberIds = members.map((member) => member.member_id)

    const roomDetailData = {
      id: roomDetail.id,
      title: roomDetail.title,
      info: {
        max_members: roomDetail.max_members,
        current_members: parseInt(roomDetail.current_members[0].count, 10),
        competition_type: roomDetail.competition_type,
        competition_theme: roomDetail.competition_theme,
      },
      date: {
        start_date: roomDetail.start_date,
        end_date: roomDetail.end_date,
      },
      settings: {
        is_private: roomDetail.is_private,
        smartwatch: roomDetail.smartwatch,
      },
      user_status: {
        is_host: roomDetail.host_id === userId,
        is_participant: memberIds.includes(userId),
      },
      host_info: roomDetail.host_info,
    }

    return NextResponse.json(
      {
        message: '경쟁방 상세 정보 조회 성공',
        data: roomDetailData,
      },
      { status: 200 },
    )
  } catch (error) {
    return NextResponse.json({ message: '예상치 못한 오류가 발생했습니다.' }, { status: 500 })
  }
}
