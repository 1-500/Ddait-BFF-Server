import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/client'

// 경쟁방 상세 조회
export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const supabase = createClient()
    const { id } = params

    // 경쟁방 정보 + 참여자 수 조회
    const { data: roomDetail, error } = await supabase
      .from('competition_room')
      .select(
        `
          *,
          current_members:competition_record(count)
        `,
      )
      .eq('id', id)
      .single()

    if (error) {
      console.error('supabase error', error)
      return NextResponse.json({ message: '경쟁방 정보 조회 중 오류 발생', error: error.message }, { status: 400 })
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
      console.error('supabase error (members)', membersError)
      return NextResponse.json(
        { message: '참여자 목록 조회 중 오류 발생', error: membersError.message },
        { status: 400 },
      )
    }

    const roomDetailData = {
      ...roomDetail,
      current_members: parseInt(roomDetail.current_members[0].count, 10),
      member_ids: members.map((member) => member.member_id),
    }

    return NextResponse.json(
      {
        message: '경쟁방 상세 정보 조회 성공',
        data: roomDetailData,
      },
      { status: 200 },
    )
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json({ message: error.message || '예상치 못한 오류가 발생했습니다.' }, { status: 500 })
  }
}
