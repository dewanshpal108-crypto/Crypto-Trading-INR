import {NextRequest , NextResponse} from "next/server"
import jwt from 'jsonwebtoken'
import prisma from "@/lib/prisma"

export const auth = async (request: NextRequest) => {
    const token = request.cookies.get('token')?.value;
    console.log("token", token);
    if(!token)
    {
        return null;
    }
    else
    {
        try
        {
            console.log("token", token);
            const decodedToken = jwt.verify(token, process.env.JWT_SECRET || "") as {email : string};
            console.log("decoded Token");
            
            const user  = await prisma.user.findFirst({
                where : {
                    email : decodedToken.email
                }
            })
            if(!user)
            {
                return null;
            }
        
            return user;
        }
        catch(error:any)
        {
            const message = error.message;
            console.log(message);
            return null;
        }
    }
}