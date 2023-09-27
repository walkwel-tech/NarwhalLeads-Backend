//TODO:
// import { Request, Response, NextFunction } from 'express';
// import { AbilityBuilder, Ability } from "@casl/ability";
// import { defineAbilitiesForUser } from './permissions'; // Create this file

// interface User {
//   isAdmin: boolean;
//   isEditor: boolean;
//   // Add other user-related properties as needed
// }

// export function caslMiddleware(
//   req: Request & { user: User }, // Assuming user information is in the request object
//   res: Response,
//   next: NextFunction
// ) {
    
// //   const { rules, can, cannot } = AbilityBuilder.extract<User>('User');

//   // Extract the user from the request object
//   const user: User = req.user; // Explicitly specify the type here

//   // Define abilities for the user
// //   defineAbilitiesForUser(user, can, cannot);

//   // Attach the ability instance to the request object
// //   req.ability = new Ability<User>(rules);

//   next();
// }
