import prisma from '@/lib/prisma'
import bcrypt from 'bcryptjs'
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  const formData = await request.formData();
  const username = formData.get('username') as string
  const email = formData.get('email') as string
  const password = formData.get('password') as string

  if (!username || !email || !password) {
    return NextResponse.json({ success: false, error: 'All fields are required.' }, { status: 400 })
  }

  try {
    // 1. Check if user already exists
    const existingUser = await prisma.user.findUnique({ where: { email } })
    if (existingUser) {
      return NextResponse.json({ success: false, error: 'Email already registered.' }, { status: 409 })
    }

    // 2. Hash the password securely
    const hashedPassword = await bcrypt.hash(password, 10)

    // 3. Save to PostgreSQL
    await prisma.user.create({
      data: {
        username: username,
        email: email,
        password: hashedPassword,
      },
    })

    return NextResponse.json({ success: true, message: 'User registered successfully!' })
  } catch (error) {
    console.error("Signup error:", error);
    return NextResponse.json({ success: false, error: 'Something went wrong. Please try again.' }, { status: 500 })
  }
}