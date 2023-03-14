import {sign} from 'jsonwebtoken';

import {UserInterface} from '../types/UserInterface';
// const TOKEN_EXPIRES_IN="8h"
export function generateToken(data: any): string {
    return sign(data, process.env.APP_SECRET as string);
    // return sign(data, process.env.APP_SECRET as string, {expiresIn:TOKEN_EXPIRES_IN} )// in seconds)
}

export function generateAuthToken(user: UserInterface): string {
    const data = {
        id: user._id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        role: user.role,
        isActive: user.isActive,
        isVerified: user.isVerified,
        isDeleted: user.isDeleted,
        date:new Date()
    };
    return generateToken(data);
}
