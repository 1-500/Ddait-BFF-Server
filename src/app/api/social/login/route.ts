import jwt from 'jsonwebtoken'
import jwkToPem from 'jwk-to-pem' // JWK를 PEM으로 변환하기 위한 라이브러리
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  try {
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

    return NextResponse.json({
      message: 'Apple login successful',
      appleUserId,
      email,
    })
  } catch (error) {
    console.error('Apple login error:', error)
    return NextResponse.json(
      {
        message: 'Apple login failed',
        error: (error as Error).message,
      },
      { status: 400 },
    )
  }
}
