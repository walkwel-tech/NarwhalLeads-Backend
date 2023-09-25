import { Router } from 'express';

import { GuestController } from '../app/Controllers/guest.controller';

const guestRoutes: Router = Router();

guestRoutes.post('/update-lead-preference', GuestController.setLeadPreferenceAccordingToIndustryInDB);


export default guestRoutes;