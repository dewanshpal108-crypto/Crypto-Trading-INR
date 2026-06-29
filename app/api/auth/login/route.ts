import prisma from "@/lib/prisma";
import bcrypt from "bcryptjs"
import jwt from "jsonwebtoken"
import { NextResponse, NextRequest } from "next/server"

export async function POST(req: NextRequest) {
    const formData = await req.formData();
    const email = formData.get('email') as string
    const password = formData.get('password') as string

    if (!email || !password) {
        return NextResponse.json({ success: false, error: 'All fields are required.' }, { status: 400 })
    }

    //select statement helps to make your query more precise, reducing query overhead and memory usage
    //keeps the required selected fields only in response 
    try {
        const user = await prisma.user.findFirst({
            where: { email: email },
            select: {
                id: true,
                username: true,
                email: true,
                password: true
            }
        })
        if (!user) {
            return NextResponse.json({ success: false, error: 'User not found.' }, { status: 401 })
        }
        const isMatch = await bcrypt.compare(password, user.password)
        if (!isMatch) {
            return NextResponse.json({ success: false, error: 'Invalid password.' }, { status: 401 })
        }

        //verify jwt secret is not empty
        const jwtSecret = process.env.JWT_SECRET
        if (!jwtSecret) {
            throw new Error('JWT secret is not defined.')
        }
        const token = jwt.sign(
            { id: user.id, username: user.username, email: user.email },
            jwtSecret,
            { expiresIn: "7d" } 
        );
        //save the token in http only cookie using NextRequest and NextResponse
        const response = NextResponse.json({ success: true, user: { id: user.id, username: user.username, email: user.email } })
        response.cookies.set('token', token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict',
            path: '/',
            maxAge: 60 * 60 * 24 * 7, // 7 days
        })

        return response;
    } catch (error) {
        console.error("Login error:", error);
        return NextResponse.json({ success: false, error: 'Something went wrong. Please try again.' }, { status: 500 })
    }
}