import {model, Model} from 'mongoose';

import {UserServiceInterface} from '../../types/UserServiceInterface';
import {UserServiceSchema} from "../../database/schemas/UserServiceDetailsSchema";

const UserService: Model<UserServiceInterface> = model<UserServiceInterface>('UserService', UserServiceSchema);

export {UserService};
