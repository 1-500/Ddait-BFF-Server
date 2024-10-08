import { NextResponse, NextRequest } from 'next/server'
import { getFriendsWithDetails } from '@/utils/friendUtils'

export async function GET(req: NextRequest) {
  try {
    const searchParams = req.nextUrl.searchParams
    const roomId = searchParams.get('roomId')

    const userId = req.headers.get('X-User-Id')

    if (!roomId) {
      return NextResponse.json(
        {
          status: 400,
          code: 'MISSING_ROOM_ID',
          message: '경쟁방 ID가 필요합니다.',
        },
        { status: 400 },
      )
    }

    const friendsData = await getFriendsWithDetails({
      userId,
      status: '승인',
      type: 'not_participant',
      roomId,
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
