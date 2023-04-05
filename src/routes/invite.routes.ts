import { Router } from 'express';

import { invitedUsersController } from '../app/Controllers';
import { Auth } from '../app/Middlewares';

const invites: Router = Router();
invites.post('/',Auth, invitedUsersController.create);
invites.get('/',Auth, invitedUsersController.show);
invites.delete('/:id',Auth, invitedUsersController.delete);
invites.patch('/:id',Auth, invitedUsersController.update);

export default invites;