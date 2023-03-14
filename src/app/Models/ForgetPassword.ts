import {model, Model} from 'mongoose';

import {forgetPassInterface} from '../../types/forgetPass';
import {forgetPasswordSchema} from "../../database/schemas/forgetPassSchema";

const ForgetPassword: Model<forgetPassInterface> = model<forgetPassInterface>('ForgetPassword', forgetPasswordSchema);

export {ForgetPassword};
