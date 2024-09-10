import { NextResponse, NextRequest } from 'next/server'
import { getFriendsWithDetails } from '@/utils/friendUtils'
import { createClient } from '@/utils/supabase/client'

export async function GET(req: NextRequest) {
  try {
    const userId = req.headers.get('X-User-Id')

    if (!userId) {
      return NextResponse.json(
        {
          status: 400,
          code: 'MISSING_USER_ID',
          message: '사용자 ID가 필요합니다.',
        },
        { status: 400 },
      )
    }

    const friendsData = await getFriendsWithDetails({
      userId,
      status: '승인',
      type: 'friends',
    })

    return NextResponse.json(
      {
        status: 200,
        code: 'SUCCESS',
        message: '친구 목록 조회에 성공했습니다.',
        data: friendsData,
      },
      { status: 200 },
    )
  } catch (error) {
    return NextResponse.json(
      {
        status: error.status || 500,
        code: error.code || 'INTERNAL_SERVER_ERROR',
        message: error.message || '예상치 못한 오류가 발생했습니다.',
      },
      { status: error.status || 500 },
    )
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const supabase = createClient()
    const url = new URL(req.url)
    const reqId = url.searchParams.get('req_id')

    if (!reqId) {
      return NextResponse.json(
        {
          status: 400,
          code: 'BAD_REQUEST',
          message: 'req_id 파라미터가 필요합니다.',
        },
        { status: 400 },
      )
    }

    // id로 친구 요청 삭제
    const { error: deleteError } = await supabase.from('friends').delete().eq('id', reqId)

    if (deleteError) {
      return NextResponse.json(
        {
          status: deleteError.status || 500,
          code: 'DELETE_ERROR',
          message: deleteError.message || '친구 요청 삭제 중 오류가 발생했습니다.',
        },
        { status: deleteError.status || 500 },
      )
    }

    return NextResponse.json(
      {
        status: 200,
        code: 'SUCCESS',
        message: '친구 요청을 거절했습니다.',
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
