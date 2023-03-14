

import { Router } from 'express';

import { AuthController } from '../app/Controllers';
import { Auth, OnlyAdmins } from '../app/Middlewares';

const auth: Router = Router();
auth.get('/',Auth,AuthController.auth)
auth.post('/register', AuthController.regsiter);
auth.post('/activeUser/:id',OnlyAdmins, AuthController.activeUser);
// auth.post('/inActiveUser/:id',OnlyAdmins, AuthController.inActiveUser);
auth.post('/login', AuthController.login);
auth.post('/adminLogin', AuthController.adminLogin);
auth.post('/checkUser', AuthController.checkUser);
auth.post('/forgetPassword', AuthController.forgetPassword);

export default auth;