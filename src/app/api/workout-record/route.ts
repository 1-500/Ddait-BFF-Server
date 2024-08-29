import { createClient } from '@/utils/supabase/client'
import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'

export async function GET(req: NextRequest) {
  try {
    // URL에서 쿼리 파라미터 가져오기
    const { searchParams } = new URL(req.url)
    const user_id = searchParams.get('user_id')
    const date = searchParams.get('date')
    console.log(date)
    if (!user_id) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 })
    }

    // Supabase 서버 클라이언트 생성
    const supabase = createClient(cookies())
    let query = supabase
      .from('workout_diary')
      .select(
        `
      id,
      member_id,
      created_at,
      edited_at,
      workout_name,
      workout_time,
      exercise_info (
        id,
        exercise_name (
          id,
          name
        ),
        set,
        reps,
        weight
      )
    `,
      )
      .eq('member_id', user_id)

    // 날짜가 제공된 경우, 해당 날짜의 기록만 필터링
    if (date) {
      const startDate = `${date}T00:00:00`
      const endDate = `${date}T23:59:59` // 하루의 끝 시간
      query = query.gte('created_at', startDate).lte('created_at', endDate)
    }

    // Supabase에서 workout_diary 데이터 가져오기
    // 쿼리 실행
    const { data: workoutRecords, error } = await query

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

    const supabase = createClient(cookies())

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
      .maybeSingle()

    if (diaryError || !workoutRecord) {
      throw new Error('Failed to create workout record')
    }

    const exerciseRecords = []

    for (const exercise of exercises) {
      // exercise_name이 테이블에 존재하는지 확인
      const { data: existingExercise, error: exerciseNameError } = await supabase
        .from('exercise_name')
        .select('id')
        .eq('name', exercise.exercise_name)
        .maybeSingle()

      if (exerciseNameError) {
        throw exerciseNameError
      }

      if (!existingExercise) {
        return NextResponse.json({ error: `Exercise name '${exercise.exercise_name}' does not exist` }, { status: 400 })
      }

      exerciseRecords.push({
        workout_diary_id: workoutRecord.id,
        exercise_name_id: existingExercise.id,
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

export async function PUT(req: NextRequest) {
  try {
    const { workout_diary_id, workout_name, workout_time, exercises } = await req.json()

    // 필수 데이터 검증
    if (!workout_diary_id || !workout_name || !workout_time || !exercises || exercises.length === 0) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const supabase = createClient(cookies())

    // workout_diary 테이블에서 기존 운동 기록 업데이트
    const { error: diaryError } = await supabase
      .from('workout_diary')
      .update({
        workout_name,
        workout_time,
        edited_at: new Date().toISOString(),
      })
      .eq('id', workout_diary_id)

    if (diaryError) {
      throw diaryError
    }

    // 기존의 exercise_info 삭제 (다시 삽입하기 위해)
    const { error: deleteError } = await supabase
      .from('exercise_info')
      .delete()
      .eq('workout_diary_id', workout_diary_id)

    if (deleteError) {
      throw deleteError
    }

    // 새로운 exercise_info 데이터 삽입
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
        workout_diary_id,
        exercise_name_id,
        set: exercise.set,
        reps: exercise.reps,
        weight: exercise.weight,
      })
    }

    const { error: exercisesError } = await supabase.from('exercise_info').insert(exerciseRecords)

    if (exercisesError) {
      throw exercisesError
    }

    return NextResponse.json({ message: 'Workout record updated successfully' }, { status: 200 })
  } catch (error: any) {
    console.log(error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  try {
    // 요청 본문에서 데이터를 가져옴
    const { workout_diary_id } = await req.json()

    // 필수 데이터 검증
    if (!workout_diary_id) {
      return NextResponse.json({ error: 'Workout Diary ID is required' }, { status: 400 })
    }

    const supabase = createClient(cookies())

    // exercise_info 테이블에서 해당 workout_diary_id와 연관된 모든 기록 삭제
    const { error: deleteExercisesError } = await supabase
      .from('exercise_info')
      .delete()
      .eq('workout_diary_id', workout_diary_id)

    if (deleteExercisesError) {
      throw deleteExercisesError
    }

    // workout_diary 테이블에서 해당 workout_diary_id 기록 삭제
    const { error: deleteDiaryError } = await supabase.from('workout_diary').delete().eq('id', workout_diary_id)

    if (deleteDiaryError) {
      throw deleteDiaryError
    }

    return NextResponse.json({ message: 'Workout record deleted successfully' }, { status: 200 })
  } catch (error: any) {
    console.log(error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
