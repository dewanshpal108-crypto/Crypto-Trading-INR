import {NextRequest , NextResponse} from "next/server"


export default async function middleware(request : NextRequest)
{
    const path = request.nextUrl.pathname;

    const isPublicPath = path === '/login' || path === '/signup' || path === '/';

    const token = request.cookies.get('token')?.value || "";

    if(isPublicPath && token)
    {
        return NextResponse.redirect(new URL('/profile', request.url));
    }

    if(!isPublicPath && !token)
    {
        return NextResponse.redirect(new URL('/', request.url));
    }

    return NextResponse.next();
}

export const config = {
    matcher : [
        "/",
        "/profile",
        "/login",
        "/signup",
        "/ticker"
    ]
}