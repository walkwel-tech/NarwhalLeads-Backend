import { Router } from 'express';

import { UserServiceController } from '../app/Controllers/userService.controller';

const userService: Router = Router();

userService.post('/', UserServiceController.create);


export default userService;