import {model, Model} from 'mongoose';

import {ClientTablePreferenceInterface} from '../../types/clientTablePrefrenceInterface';
import {ClientTablePreferenceSchema} from "../../database/schemas/clientTablePrefrenceSchema";

const ClientTablePreference: Model<ClientTablePreferenceInterface> = model<ClientTablePreferenceInterface>('ClientTablePreference',ClientTablePreferenceSchema );

export {ClientTablePreference};