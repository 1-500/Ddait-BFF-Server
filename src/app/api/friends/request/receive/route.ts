import { NextResponse, NextRequest } from 'next/server'
import { getFriendsWithDetails } from '@/utils/friendUtils'

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
        { status: 400 }
      )
    }

    const friendsData = await getFriendsWithDetails({
      userId,
      status: '대기',
      type: 'received',
    })

    return NextResponse.json(
      {
        status: 200,
        code: 'SUCCESS',
        message: '받은 친구 요청 목록 조회에 성공했습니다.',
        data: friendsData,
      },
      { status: 200 }
    )
  } catch (error) {
    return NextResponse.json(
      {
        status: error.status || 500,
        code: error.code || 'INTERNAL_SERVER_ERROR',
        message: error.message || '예상치 못한 오류가 발생했습니다.',
      },
      { status: error.status || 500 }
    )
  }
}