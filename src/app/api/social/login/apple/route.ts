import jwt from 'jsonwebtoken'
import jwkToPem from 'jwk-to-pem' // JWK를 PEM으로 변환하기 위한 라이브러리
import { createClient } from '@/utils/supabase/server'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  try {
    const cookieStore = cookies()
    const supabase = createClient(cookieStore)
    const { identityToken } = await request.json()
    console.log('Received identityToken:', identityToken)

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

    const pem = jwkToPem(applePublicKey)

    const decodedToken = jwt.verify(identityToken, pem, {
      algorithms: ['RS256'],
      issuer: 'https://appleid.apple.com',
    })

    console.log('Decoded Token:', decodedToken)

    const { sub: appleUserId, email } = decodedToken as any

    let { data: member, error: memberError } = await supabase.from('member').select('*').eq('email', email).single()

    if (!member) {
      const { data: newMember, error: newMemberError } = await supabase
        .from('member')
        .insert([
          {
            email,
            nickname: 'Apple User',
            user_level: 0,
            birthdate: '1970-01-01',
          },
        ])
        .select()
        .single()

      if (newMemberError) {
        throw new Error('회원 생성 오류: ' + newMemberError.message)
      }

      member = newMember
    }

    const { data: socialLogin, error: socialLoginError } = await supabase
      .from('social_login')
      .upsert({
        provider: 'apple',
        provider_user_id: appleUserId,
        email,
        user_level: member.user_level,
        member_id: member.id,
      })
      .select()
      .single()

    if (socialLoginError) {
      throw new Error('소셜 로그인 저장 오류: ' + socialLoginError.message)
    }

    return NextResponse.json({
      success: true,
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
