import {model, Model} from 'mongoose';

import {subscriberListInterface} from '../../types/SubscriberListInterface';
import {SubscriberListSchema} from "../../database/schemas/subscriberListSchema";

const SubscriberList: Model<subscriberListInterface> = model<subscriberListInterface>('SubscriberList',SubscriberListSchema );

export {SubscriberList};