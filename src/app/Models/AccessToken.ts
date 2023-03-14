import {model, Model} from 'mongoose';

import {AccessTokenInterface} from '../../types/AccessTokenInterface';
import {AccessTokenSchema} from "../../database/schemas/accessTokenSchema";

const AccessToken: Model<AccessTokenInterface> = model<AccessTokenInterface>('AccessToken', AccessTokenSchema);

export {AccessToken};
