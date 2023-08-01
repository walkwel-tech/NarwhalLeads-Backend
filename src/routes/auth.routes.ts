

import { Router } from 'express';

import { AuthController } from '../app/Controllers';
import { Auth, OnlyAdmins } from '../app/Middlewares';

const auth: Router = Router();
auth.get('/map',AuthController.showMapFile)
auth.get('/map/ireland',AuthController.showMapFileForIreland)
// auth.get('/mapForLabel',AuthController.showMapFileForLabel)
auth.get('/',Auth,AuthController.auth)
auth.get('/me',Auth,AuthController.me)
auth.patch('/test',AuthController.test)
auth.post('/register', AuthController.register);
auth.post('/return-url', AuthController.returnUrlApi);
auth.post('/activeUser/:id',OnlyAdmins, AuthController.activeUser);
auth.post('/admin/register', AuthController.adminRegister);
auth.post('/login', AuthController.login);
auth.post('/adminLogin', AuthController.adminLogin);
auth.post('/checkUser', AuthController.checkUser);
auth.post('/forgetPassword', AuthController.forgetPassword);

export default auth;