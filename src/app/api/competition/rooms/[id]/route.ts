import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/client'
import { cookies } from 'next/headers'

// 경쟁방 상세 조회
export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
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
    const { id } = params

    // 경쟁방 정보 조회
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
      console.error('Supabase error', error)
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
      console.error('Supabase error (members)', membersError)
      return NextResponse.json(
        { message: '참여자 목록 조회 중 오류 발생', error: membersError.message },
        { status: 400 },
      )
    }

    const memberIds = members.map((member) => member.member_id)
    console.log('Member IDs:', memberIds)

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
        is_host: roomDetail.host_id === currentMemberId,
        is_participant: memberIds.includes(currentMemberId),
      },
      member_ids: memberIds,
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