import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/client'
import { cookies } from 'next/headers'

// 전체 경쟁방 목록 조회
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

    // 전체 경쟁방 목록 조회
    const { data: allRooms, error } = await supabase
      .from('competition_room')
      .select('*, current_members:competition_record(count)')
      .order('start_date', { ascending: false })

    if (error) {
      console.error('Supabase error', error)
      return NextResponse.json({ message: '경쟁방 목록 조회 중 오류 발생' }, { status: 400 })
    }

    const allRoomsData = allRooms.map((room) => ({
      id: room.id,
      title: room.title,
      info: {
        max_members: room.max_members,
        current_members: parseInt(room.current_members[0]?.count || '0', 10),
        competition_type: room.competition_type,
        competition_theme: room.competition_theme,
      },
      date: {
        start_date: room.start_date,
        end_date: room.end_date,
      },
      settings: {
        is_private: room.is_private,
        smartwatch: room.smartwatch,
      },
      user_status: {
        is_host: room.host_id === currentMemberId,
        is_participant: false, // 아래에서 업데이트
      },
    }))

    // 경쟁방 참여 여부 확인
    const { data: participations, error: participationError } = await supabase
      .from('competition_record')
      .select('competition_room_id')
      .eq('member_id', currentMemberId)

    if (participationError) {
      console.error('Participation check error', participationError)
    } else {
      const participatedRoomIds = new Set(participations.map((p) => p.competition_room_id))
      allRoomsData.forEach((room) => {
        room.user_status.is_participant = participatedRoomIds.has(room.id)
      })
    }

    return NextResponse.json(
      {
        message: '전체 경쟁방 목록 조회 성공',
        data: allRoomsData,
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