'use client'

import { Button } from '@/components/ui/button'
import Image from 'next/image'

const SocialLoginPageLayout = () => {
  return (
    <div className="flex flex-col items-center space-x-4 bg-[#1C1C1C] p-2">
      <div className="text-md font-semibold text-[#5D5DFC]">SNS 로그인</div>
      <div className="flex gap-2 mt-1">
        <Button
          variant="outline"
          size="icon"
          className="rounded-full shadow-md hover:bg-gray-100 border-2 border-[#1C1C1C] transition-opacity duration-100 active:opacity-40"
        >
          <Image src="/assets/login/naverIcon.png" alt="Naver Icon" width={40} height={40} />
        </Button>
        <Button
          variant="outline"
          size="icon"
          className="rounded-full shadow-md hover:bg-gray-100 border-2 border-[#1C1C1C] transition-opacity duration-100 active:opacity-40"
        >
          <Image src="/assets/login/kakaoIcon.png" alt="Kakao Icon" width={40} height={40} />
        </Button>
        <Button
          variant="outline"
          size="icon"
          className="rounded-full shadow-md hover:bg-gray-100 border-2 border-[#1C1C1C] transition-opacity duration-100 active:opacity-40"
        >
          <Image src="/assets/login/googleIcon.png" alt="Google Icon" width={40} height={40} />
        </Button>
        <Button
          variant="outline"
          size="icon"
          className="rounded-full shadow-md hover:bg-gray-100 border-2 border-[#1C1C1C] transition-opacity duration-100 active:opacity-40"
        >
          <Image src="/assets/login/appleIcon.png" alt="Apple Icon" width={40} height={40} />
        </Button>
      </div>
    </div>
  )
}

export default SocialLoginPageLayout
