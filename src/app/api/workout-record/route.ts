// src/app/api/workout-record/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '../../../utils/supabase/server'

export async function GET(req: NextRequest) {
  try {
    // URL에서 쿼리 파라미터 가져오기
    const { searchParams } = new URL(req.url)
    const user_id = searchParams.get('user_id')
    console.log('user_id :>> ', user_id)

    if (!user_id) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 })
    }

    // Supabase 서버 클라이언트 생성
    const supabase = createClient()

    // Supabase에서 workout_diary 데이터 가져오기
    const { data: workoutRecords, error } = await supabase
      .from('workout_diary')
      .select(`id,member_id,created_at,edited_at,workout_name,workout_time`)
      .eq('member_id', user_id) // user_id 와 member_id가 같은 데이터만 가져오기

    console.log('data, error :>> ', workoutRecords, error)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json(workoutRecords, { status: 200 })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const { member_id, workout_name, workout_time, exercises } = await req.json()

    if (!member_id || !workout_name || !workout_time || !exercises || exercises.length === 0) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const supabase = createClient()

    // workout_diary 테이블에 새로운 운동 기록 삽입
    const { data: workoutRecord, error: diaryError } = await supabase
      .from('workout_diary')
      .insert([
        {
          member_id,
          workout_name,
          workout_time,
          created_at: new Date().toISOString(),
        },
      ])
      .select()
      .single()

    if (diaryError) {
      throw diaryError
    }

    const exerciseRecords = []

    for (const exercise of exercises) {
      // exercise_name이 테이블에 존재하는지 확인
      const { data: existingExercise, error: exerciseNameError } = await supabase
        .from('exercise_name')
        .select('id')
        .eq('name', exercise.exercise_name)
        .single()

      if (exerciseNameError && exerciseNameError.code !== 'PGRST116') {
        throw exerciseNameError
      }

      let exercise_name_id

      if (!existingExercise) {
        // exercise_name 테이블에 없으므로 새로 추가
        const { data: newExercise, error: newExerciseError } = await supabase
          .from('exercise_name')
          .insert([{ name: exercise.exercise_name, description: '' }])
          .select('id')
          .single()

        if (newExerciseError) {
          throw newExerciseError
        }

        exercise_name_id = newExercise.id
      } else {
        exercise_name_id = existingExercise.id
      }

      exerciseRecords.push({
        workout_diary_id: workoutRecord.id,
        exercise_name_id: exercise_name_id,
        set: exercise.set,
        reps: exercise.reps,
        weight: exercise.weight,
      })
    }

    const { error: exercisesError } = await supabase.from('exercise_info').insert(exerciseRecords)

    if (exercisesError) {
      throw exercisesError
    }

    return NextResponse.json({ message: 'Workout record created successfully' }, { status: 201 })
  } catch (error: any) {
    console.log(error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
