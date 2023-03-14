import {model, Model} from 'mongoose';

import {LeadTablePreferenceInterface} from '../../types/LeadTablePreferenceInterface';
import {LeadTablePreferenceSchema} from "../../database/schemas/LeadTablePreferenceSchema";

const LeadTablePreference: Model<LeadTablePreferenceInterface> = model<LeadTablePreferenceInterface>('LeadTablePreference',LeadTablePreferenceSchema );

export {LeadTablePreference};