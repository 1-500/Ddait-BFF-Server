import { NextResponse, NextRequest } from 'next/server'
import { cookies } from 'next/headers'
import bcrypt from 'bcrypt'
import { createClient } from '@/utils/supabase/server'

export async function POST(req: NextRequest) {
  try {
    const cookieStore = cookies()
    const supabase = createClient(cookieStore)
    const { email, password } = await req.json()

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (error) {
      return NextResponse.json({ message: error.message }, { status: error.status })
    }
    return NextResponse.json(data.session)
  } catch (error) {
    return NextResponse.json({ message: error })
  }
}

//sdf
