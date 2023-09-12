import { Router } from 'express';

import { nonBillableUsersController } from '../app/Controllers/nonBillableUser.controller';
import { Auth, OnlyAdmins } from '../app/Middlewares';

const nonBillables: Router = Router();
nonBillables.post('/',OnlyAdmins, nonBillableUsersController.create);
nonBillables.delete('/:id',OnlyAdmins, nonBillableUsersController.delete);
nonBillables.post('/:id',Auth, nonBillableUsersController.update);
nonBillables.get('/',Auth, nonBillableUsersController.show);

export default nonBillables;