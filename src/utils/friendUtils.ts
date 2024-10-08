import { createClient } from '@/utils/supabase/client'

export async function getFriendsWithDetails({ userId, status, type, roomId = '' }) {
  const supabase = createClient()

  // 조인 사용
  const query = supabase
    .from('friends')
    .select(
      `id,
      status, 
      member_id, 
      friend_member_id, 
      member:member_id(id, introduce, profile_image, nickname, preferred_sport), 
      friend:friend_member_id(id, introduce, profile_image, nickname, preferred_sport)`,
    )
    .eq('status', status)

  // 친구 요청 타입에 따라 쿼리 조건 변경
  switch (type) {
    case 'received':
      query.or(`friend_member_id.eq.${userId}`)
      break
    case 'sent':
      query.or(`member_id.eq.${userId}`)
      break
    case 'friends':
    case 'not_participant':
      query.or(`member_id.eq.${userId},friend_member_id.eq.${userId}`)
      break
  }

  const { data: friendsData, error: friendsError } = await query

  if (friendsError) {
    throw {
      status: friendsError.status || 500,
      code: 'MEMBER_FRIEND_JOIN_ERROR',
      message: friendsError.message || 'member테이블과 friends테이블 조인 중 오류가 발생했습니다.',
    }
  }

  // 상대방의 정보만 필터링( memberId가 내 아이디면 friendId기준 조회해야 상대방 데이터임. 반대 경우도 동일)
  const friendDetails = friendsData.map((data) => ({
    table_id: data.id,
    ...(data.member_id === userId ? data.friend : data.member),
  }))

  if (type === 'not_participant') {
    const { data: competitionRecordData, error: competitionRecordError } = await supabase
      .from('competition_record')
      .select('member_id')
      .eq('competition_room_id', roomId)

    if (competitionRecordError) {
      throw {
        status: competitionRecordError.status || 500,
        code: 'COMPETITION_RECORD_SELECT_ERROR',
        message: competitionRecordError.message || '경쟁 기록 데이터를 가져오는데 실패했습니다.',
      }
    }
    return friendDetails.filter(
      (record) => !competitionRecordData.map((record) => record.member_id).includes(record.id),
    )
  }
  return friendDetails
}
