import { Router } from 'express';

import { TransactionController } from '../app/Controllers';

const transactions: Router = Router();

transactions.get('/', TransactionController.show);


export default transactions;