import {model, Model} from 'mongoose';
import { TransactionInterface } from '../../types/TransactionInterface';
import { TransactionSchema } from '../../database/schemas/TransactionSchema';
const Transaction: Model<TransactionInterface> = model<TransactionInterface>('Transaction', TransactionSchema);

export {Transaction};