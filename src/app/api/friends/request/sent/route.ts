import { NextResponse, NextRequest } from 'next/server';
import { createClient } from '@/utils/supabase/client';

export async function GET(req: NextRequest) {
  try {
    const supabase = createClient();
    const userId = req.headers.get('X-User-Id');

    if (!userId) {
      return NextResponse.json(
        {
          status: 400,
          code: 'MISSING_USER_ID',
          message: '사용자 ID가 필요합니다.',
        },
        { status: 400 }
      );
    }

    const { data: friendsData, error: friendsError } = await supabase
      .from('friends')
      .select('member_id, friend_member_id, status')
      .or(`member_id.eq.${userId}`)
      .eq('status', '대기 중');

    if (friendsError) {
      return NextResponse.json(
        {
          status: friendsError.status || 500,
          code: 'FRIENDS_LIST_ERROR',
          message: friendsError.message || '보낸 친구 신청 목록 조회 중 오류가 발생했습니다.',
        },
        { status: friendsError.status || 500 }
      );
    }

    // 친구 목록을 member 테이블에서 가져온 친구의 상세 정보로 변환
    const friendIds = friendsData.map(friend => {
      return friend.member_id === userId ? friend.friend_member_id : friend.member_id;
    });

    const { data: friendsDetails, error: detailsError } = await supabase
      .from('member')
      .select('id, introduce, profile_image, nickname, preferred_sport')
      .in('id', friendIds);

    if (detailsError) {
      return NextResponse.json(
        {
          status: detailsError.status || 500,
          code: 'FRIENDS_DETAILS_ERROR',
          message: detailsError.message || '친구 상세 정보 조회 중 오류가 발생했습니다.',
        },
        { status: detailsError.status || 500 }
      );
    }

    return NextResponse.json(
      {
        status: 200,
        code: 'SUCCESS',
        message: '보낸 친구 신청 목록 조회에 성공했습니다.',
        data: friendsDetails,
      },
      { status: 200 }
    );
  } catch (error) {
    return NextResponse.json(
      {
        status: 500,
        code: 'INTERNAL_SERVER_ERROR',
        message: error.message || '예상치 못한 오류가 발생했습니다.',
      },
      { status: 500 }
    );
  }
}