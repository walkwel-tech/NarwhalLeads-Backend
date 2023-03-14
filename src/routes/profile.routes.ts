import { Router } from 'express';
import multer from "multer";

import { ProfileController } from '../app/Controllers/';
import { storeFile } from "../app/Middlewares/fileUpload";

import { FileEnum } from "../types/FileEnum";

const profile: Router = Router();
// let maxSize = 1 * 1000 * 1000;


const upload = multer({ storage: storeFile(`${process.cwd()}${FileEnum.PUBLICDIR}${FileEnum.PROFILEIMAGE}`) })

profile.post('/change-password', ProfileController.changePassword);
profile.patch('/update-profile', upload.single('image'), ProfileController.updateProfile);

export default profile;