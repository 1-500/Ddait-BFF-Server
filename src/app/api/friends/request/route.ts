import { NextResponse, NextRequest } from 'next/server'
import { createClient } from '@/utils/supabase/client'

export async function POST(req: NextRequest) {
  try {
    const supabase = createClient()
    const userId = req.headers.get('X-User-Id')
    if (!userId) {
      return NextResponse.json(
        {
          status: 401,
          error: 'Unauthorized',
          message: '로그인된 사용자 ID가 필요합니다.',
        },
        { status: 401 },
      )
    }

    const { friend_member_id } = await req.json()
    if (!friend_member_id) {
      return NextResponse.json(
        {
          status: 400,
          error: 'Bad Request',
          message: '친구 회원 ID가 필요합니다.',
        },
        { status: 400 },
      )
    }

    // 사용자 자신에게 친구 요청을 보내는지 확인
    if (userId === friend_member_id) {
      return NextResponse.json(
        {
          status: 400,
          error: 'Bad Request',
          message: '자신에게 친구 요청을 보낼 수 없습니다.',
        },
        { status: 400 },
      )
    }

    // friend_member_id가 member table에 있는지 확인
    const { data: memberData, error: memberError } = await supabase
      .from('member')
      .select('id, nickname')
      .eq('id', friend_member_id)
      .single()

    if (memberError || !memberData) {
      return NextResponse.json(
        {
          status: memberError?.status || 400,
          error: 'Bad Request',
          message: '유효하지 않은 친구 회원 ID입니다.',
        },
        { status: memberError?.status || 400 },
      )
    }

    // 친구 신청 추가
    const { data: friendRequest, error: insertError } = await supabase
      .from('friends')
      .insert([{ member_id: userId, friend_member_id, status: '대기 중' }])
      .select()
      .single()

    if (insertError) {
      return NextResponse.json(
        {
          status: insertError.status || 500,
          error: 'Internal Server Error',
          message: insertError.message,
        },
        { status: insertError.status || 500 },
      )
    }

    const responseData = {
      status: friendRequest.status,
      friend_member_nickname: memberData.nickname,
    }

    return NextResponse.json(
      {
        status: 201,
        error: 'Success',
        message: '친구 신청이 완료되었습니다.',
        data: responseData,
      },
      { status: 201 },
    )
  } catch (error) {
    return NextResponse.json(
      {
        status: error?.status || 500,
        error: 'Internal Server Error',
        message: error.message || '예상치 못한 오류가 발생했습니다.',
      },
      { status: error?.status || 500 },
    )
  }
}
