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
          code: 'UNAUTHORIZED',
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
          code: 'MISSING_FRIEND_MEMBER_ID',
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
          code: 'CANNOT_ADD_SELF',
          message: '자신에게 친구 요청을 보낼 수 없습니다.',
        },
        { status: 400 },
      )
    }

    // 친구 관계가 이미 있는지 확인
    const { data: existingFriendData, error: existingFriendError } = await supabase
      .from('friends')
      .select('status, member_id, friend_member_id')
      .or(
        `and(member_id.eq.${userId},friend_member_id.eq.${friend_member_id}),and(member_id.eq.${friend_member_id},friend_member_id.eq.${userId})`,
      )
      .maybeSingle()

    if (existingFriendError) {
      return NextResponse.json(
        {
          status: existingFriendError.error || 500,
          code: 'INTERNAL_SERVER_ERROR',
          message: existingFriendError.message || '친구 신청 과정에서 오류가 발생했습니다.',
        },
        { status: existingFriendError.error || 500 },
      )
    }

    if (existingFriendData) {
      const { status, member_id, friend_member_id } = existingFriendData

      if (member_id === userId && status === '대기') {
        return NextResponse.json(
          {
            status: 400,
            code: 'FRIEND_REQUEST_PENDING',
            message: '이미 친구 요청을 보냈습니다. 승인을 기다려주세요.',
            friendStatus: status,
          },
          { status: 400 },
        )
      }

      if (friend_member_id === userId && status === '대기') {
        return NextResponse.json(
          {
            status: 400,
            code: 'FRIEND_REQUEST_RECEIVED',
            message: '상대방이 친구 요청을 보냈습니다. 친구 요청을 수락하세요.',
            friendStatus: status,
          },
          { status: 400 },
        )
      }

      if (status === '친구 승인') {
        return NextResponse.json(
          {
            status: 400,
            code: 'ALREADY_FRIENDS',
            message: '이미 친구 관계입니다.',
            friendStatus: status,
          },
          { status: 400 },
        )
      }
    }

    // member table에서 friend_member_id로 정보 조회
    const { data: memberData, error: memberError } = await supabase
      .from('member')
      .select('id, nickname')
      .eq('id', friend_member_id)
      .single()

    if (memberError || !memberData) {
      return NextResponse.json(
        {
          status: memberError.status || 400,
          code: 'INVALID_FRIEND_MEMBER_ID',
          message: '유효하지 않은 친구 회원 ID입니다.',
        },
        { status: memberError?.status || 400 },
      )
    }

    // 친구 신청 추가
    const { data: friendRequest, error: insertError } = await supabase
      .from('friends')
      .insert([{ member_id: userId, friend_member_id, status: '대기' }])
      .select()
      .single()

    if (insertError) {
      return NextResponse.json(
        {
          status: insertError.status || 500,
          code: 'INSERT_ERROR',
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
        code: 'SUCCESS',
        message: '친구 신청이 완료되었습니다.',
        data: responseData,
      },
      { status: 201 },
    )
  } catch (error) {
    return NextResponse.json(
      {
        error: 500,
        code: 'INTERNAL_SERVER_ERROR',
        message: error,
      },
      { status: error.status || 500 },
    )
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const supabase = createClient()
    const userId = req.headers.get('X-User-Id')
    const url = new URL(req.url)
    const reqId = url.searchParams.get('req_id')

    if (!userId) {
      return NextResponse.json(
        {
          status: 401,
          code: 'UNAUTHORIZED',
          message: '로그인된 사용자 ID가 필요합니다.',
        },
        { status: 401 },
      )
    }

    if (!reqId) {
      return NextResponse.json(
        {
          status: 400,
          code: 'MISSING_REQUEST_ID',
          message: '삭제할 요청의 ID가 필요합니다.',
        },
        { status: 400 },
      )
    }

    // 요청을 삭제하기 전에 friend_member_id 조회
    const { data: friendRequest, error: fetchError } = await supabase
      .from('friends')
      .select('friend_member_id, member_id')
      .eq('id', reqId)
      .single()

    if (fetchError || !friendRequest) {
      return NextResponse.json(
        {
          status: fetchError?.status || 404,
          code: fetchError ? 'FETCH_ERROR' : 'NOT_FOUND',
          message: fetchError ? fetchError.message : '친구 요청을 찾을 수 없습니다.',
        },
        { status: fetchError?.status || 404 },
      )
    }

    const { friend_member_id, member_id } = friendRequest

    // 사용자와 다른 쪽의 ID를 판별
    const otherMemberId = userId === member_id ? friend_member_id : member_id

    // 요청 삭제
    const { error: deleteError } = await supabase.from('friends').delete().eq('id', reqId)

    if (deleteError) {
      return NextResponse.json(
        {
          status: deleteError.status || 500,
          code: 'DELETE_ERROR',
          message: deleteError.message || '친구 요청을 삭제하는 중 오류가 발생했습니다.',
        },
        { status: deleteError.status || 500 },
      )
    }

    // 삭제된 친구의 닉네임 조회
    const { data: memberData, error: memberError } = await supabase
      .from('member')
      .select('nickname')
      .eq('id', otherMemberId)
      .single()

    if (memberError) {
      return NextResponse.json(
        {
          status: memberError.status || 500,
          code: 'FETCH_MEMBER_ERROR',
          message: memberError.message || '상대방 정보 조회 중 오류가 발생했습니다.',
        },
        { status: memberError.status || 500 },
      )
    }

    const responseData = {
      friend_nickname: memberData.nickname,
    }

    return NextResponse.json(
      {
        status: 200,
        code: 'SUCCESS',
        message: '친구 요청을 취소했습니다.',
        data: responseData,
      },
      { status: 200 },
    )
  } catch (error) {
    return NextResponse.json(
      {
        status: error.status || 500,
        code: 'INTERNAL_SERVER_ERROR',
        message: error.message || '예상치 못한 오류가 발생했습니다.',
      },
      { status: error.status || 500 },
    )
  }
}
