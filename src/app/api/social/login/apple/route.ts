import jwt from 'jsonwebtoken'
import jwkToPem from 'jwk-to-pem' // JWK를 PEM으로 변환하기 위한 라이브러리
import { createClient } from '@/utils/supabase/server'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  try {
    // Supabase 클라이언트 초기화
    const cookieStore = cookies()
    const supabase = createClient(cookieStore)
    const { identityToken } = await request.json()
    console.log('Received identityToken:', identityToken)

    // Apple의 공개 키 가져오기
    const response = await fetch('https://appleid.apple.com/auth/keys')
    const appleKeys = await response.json()
    console.log('Apple public keys:', appleKeys)

    // JWT 헤더에서 kid 추출
    const decodedHeader = jwt.decode(identityToken, { complete: true })
    const { kid } = decodedHeader?.header

    // kid와 일치하는 공개 키 찾기
    const applePublicKey = appleKeys.keys.find((key: any) => key.kid === kid)

    if (!applePublicKey) {
      throw new Error('Public key not found')
    }

    // JWK를 PEM으로 변환
    const pem = jwkToPem(applePublicKey)

    // JWT 검증
    const decodedToken = jwt.verify(identityToken, pem, {
      algorithms: ['RS256'],
      issuer: 'https://appleid.apple.com',
    })

    console.log('Decoded Token:', decodedToken)

    const { sub: appleUserId, email } = decodedToken as any

    // Supabase에서 해당 사용자가 있는지 확인
    let { data: member, error: memberError } = await supabase.from('member').select('*').eq('email', email).single()

    // 사용자가 없으면 새로운 사용자 생성
    if (!member) {
      const { data: newMember, error: newMemberError } = await supabase
        .from('member')
        .insert([
          {
            email,
            nickname: 'Apple User', // 기본 닉네임 설정
            user_level: 0, // 기본 사용자 레벨
            birthdate: '1970-01-01', // 기본 생년월일 설정
          },
        ])
        .select()
        .single()

      if (newMemberError) {
        throw new Error('회원 생성 오류: ' + newMemberError.message)
      }

      member = newMember
    }

    // social_login 테이블에 소셜 로그인 정보 저장 또는 업데이트
    const { data: socialLogin, error: socialLoginError } = await supabase
      .from('social_login')
      .upsert({
        provider: 'apple',
        provider_user_id: appleUserId,
        email,
        user_level: member.user_level,
        member_id: member.id, // member 테이블의 UUID 연결
      })
      .select()
      .single()

    if (socialLoginError) {
      throw new Error('소셜 로그인 저장 오류: ' + socialLoginError.message)
    }

    // 인증 성공 시 클라이언트로 응답
    return NextResponse.json({
      success: true, // 클라이언트에서 사용되는 success 플래그
      message: 'Apple login successful',
      member,
      socialLogin,
    })
  } catch (error) {
    console.error('Apple login error:', error)
    return NextResponse.json(
      {
        success: false,
        message: 'Apple login failed',
        error: (error as Error).message,
      },
      { status: 400 },
    )
  }
}
