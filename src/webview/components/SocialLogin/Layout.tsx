'use client'

import { Button } from '@/components/ui/button'
import { signIn, signOut, useSession } from 'next-auth/react'
import { useEffect } from 'react'

const SocialLoginPageLayout = () => {
  const { data: session, status } = useSession()
  useEffect(() => {
    const handleMessage = (event) => {
      const message = JSON.parse(event.data)
      console.log(message)
      if (message.type === 'DDait_APP') {
        if (message.data === 'google') {
          signIn('google')
        } else if (message.data === 'kakao') {
          signIn('kakao')
        }
      }
    }

    window.addEventListener('message', handleMessage)

    return () => {
      window.removeEventListener('message', handleMessage)
    }
  }, [])
  useEffect(() => {
    const socialLogin = async () => {
      const { id } = session?.user
      const response = await fetch(`/api/socialLogin?userId=${id}`) // accessToken을 받아와서 웹뷰로 전달시킴
      // 첫 로그인 시에만 이렇게 처리하고 그다음부터 세션 유지는 자동으로 토큰 만료 시간되면 API 요청하는식으로 처리하기
    }
    socialLogin()
  }, [session])

  if (status === 'loading') {
    return <div>로딩중</div>
  }
  console.log(session, status, 123)

  return (
    <div>
      <Button variant="outline" onClick={() => signIn('google')} />
    </div>
  )
}

export default SocialLoginPageLayout
