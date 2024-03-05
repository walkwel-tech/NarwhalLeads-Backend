import {model, Model} from 'mongoose';
import { AuthenticationKeySchema } from '../../database/schemas/authenticationKeySchema';
import { AuthenticationKey } from '../../types/AuthenticationKeyInterface';


const AuthKey: Model<AuthenticationKey> = model<AuthenticationKey>('AuthKey', AuthenticationKeySchema);

export {AuthKey};
