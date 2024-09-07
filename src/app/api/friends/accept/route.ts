import { NextResponse, NextRequest } from 'next/server'
import { createClient } from '@/utils/supabase/client'

export async function PATCH(req: NextRequest) {
  try {
    const supabase = createClient();
    const userId = req.headers.get('X-User-Id');
    const url = new URL(req.url);
    const reqId = url.searchParams.get('req_id');
    
    // id로 상태 업데이트
    const { data: updatedFriendData, error: updatedFriendError } = await supabase
      .from('friends')
      .update({ status: '친구 승인' })
      .eq('id', reqId)
      .select('friend_member_id, member_id')
      .single()
    
      console.log(reqId)
    if (updatedFriendError || !updatedFriendData) {
      return NextResponse.json(
        {
          status: updatedFriendError?.status || 404,
          code: updatedFriendError ? 'UPDATE_ERROR' : 'NOT_FOUND',
          message: updatedFriendError ? updatedFriendError.message : '친구 요청을 찾을 수 없습니다.',
        },
        { status: updatedFriendError?.status || 404 }
      );
    }
    
    const { friend_member_id, member_id } = updatedFriendData;
    
    // userId와 다른 쪽의 닉네임 조회
    const otherMemberId = userId === member_id ? friend_member_id : member_id;
    
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
      );
    }
    
    const responseData = {
      friend_nickname: memberData.nickname,
    };
    
    return NextResponse.json(
      {
        status: 200,
        code: 'SUCCESS',
        message: '친구 요청을 승인했습니다.',
        data: responseData,
      },
      { status: 200 },
    );
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
