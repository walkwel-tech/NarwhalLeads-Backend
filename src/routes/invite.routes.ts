import { Router } from 'express';

import { invitedUsersController } from '../app/Controllers';
import { Auth } from '../app/Middlewares';

const invites: Router = Router();
invites.post('/admin',Auth, invitedUsersController.addAdmins);
invites.delete('/admin/:id',Auth, invitedUsersController.deleteAdmin);
invites.post('/admin/:id',Auth, invitedUsersController.updateAdmin);
invites.get('/admin',Auth, invitedUsersController.indexAdmin);
invites.post('/subscriber',Auth, invitedUsersController.addSubscribers);
invites.delete('/subscriber/:id',Auth, invitedUsersController.deleteSubscriber);
invites.post('/',Auth, invitedUsersController.create);
invites.get('/',Auth, invitedUsersController.show);
invites.delete('/:id',Auth, invitedUsersController.delete);
invites.post('/:id',Auth, invitedUsersController.update);
invites.post('/:id',Auth, invitedUsersController.update);
invites.get('/subscriber',Auth, invitedUsersController.indexSubscriber);









export default invites;