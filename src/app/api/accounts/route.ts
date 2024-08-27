import { NextResponse, NextRequest } from 'next/server'
import bcrypt from 'bcrypt'
import { formatBirthdate } from '@/utils/accounts'

import { createClient } from '@/utils/supabase/client'

export async function POST(req: NextRequest) {
  try {
    const supabase = createClient()

    const { email, password, nickname, birthdate, gender, location, preferred_sport } = await req.json()
    const hashedPassword = await bcrypt.hash(password, 10)

    const { error: signUpError } = await supabase.auth.signUp({
      email,
      password,
    })

    if (signUpError) {
      return NextResponse.json({ message: signUpError }, { status: signUpError.status })
    }
    const result = await supabase.from('member').insert({
      nickname,
      email,
      birthdate: formatBirthdate(birthdate),
      password: hashedPassword,
      gender,
      preferred_sport,
      location,
    })

    if (result.error) {
      return NextResponse.json({ message: result.error }, { status: result.status })
    }

    return NextResponse.json({ status: result.status })
  } catch (error) {
    return NextResponse.json({ message: error }, { status: 400 })
  }
}
