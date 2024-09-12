import { NextResponse, NextRequest } from 'next/server'
import { createClient } from '@/utils/supabase/client'

export async function GET(req: NextRequest) {
  try {
    const supabase = createClient()

    const { data: membersData, error: membersError } = await supabase
      .from('member')
      .select('nickname, location')

    if (membersError) {
      return NextResponse.json(
        {
          status: membersError.status || 500,
          code: 'FETCH_MEMBERS_ERROR',
          message: membersError.message || '사용자들의 정보를 가져오는 중 오류가 발생했습니다.',
        },
        { status: membersError.status || 500 },
      )
    }

    if (!membersData || membersData.length === 0) {
      return NextResponse.json(
        {
          status: 404,
          code: 'NO_USERS_FOUND',
          message: '사용자가 존재하지 않습니다.',
        },
        { status: 404 },
      )
    }

    // location 값이 있는 유저들만
    const membersWithLocation = membersData
      .filter(member => member.location)
      .map(member => {
        const [latitude, longitude] = member.location.split(',').map(Number)
        return {
          nickname: member.nickname,
          location: {
            latitude,
            longitude,
          },
        }
      })

    return NextResponse.json(
      {
        status: 200,
        code: 'SUCCESS',
        message: '모든 유저의 위치 정보를 성공적으로 조회했습니다.',
        data: membersWithLocation,
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