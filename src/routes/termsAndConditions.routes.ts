import { Router } from 'express';

import { TermsAndConditionsController } from '../app/Controllers';
import { Auth, OnlyAdmins } from '../app/Middlewares';

const TermsAndConditions: Router = Router();
TermsAndConditions.get('/', Auth,TermsAndConditionsController.show);
TermsAndConditions.get('/file',TermsAndConditionsController.showFile);
TermsAndConditions.patch('/', OnlyAdmins,TermsAndConditionsController.create);


export default TermsAndConditions;