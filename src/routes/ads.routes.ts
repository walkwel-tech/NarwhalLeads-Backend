import { Router } from "express";
// import { AdsController } from "../app/Controllers/ads.controller";
import { AdsController } from "../app/Controllers/Ads";
import multer from "multer";
import { FileEnum } from "../types/FileEnum";
import { fileMaxSize } from "../utils/constantFiles/fileMaxSize";
import { storeFile } from "../app/Middlewares/fileUpload";
const adsRoutes: Router = Router();

const upload = multer({
  storage: storeFile(`${process.cwd()}${FileEnum.PUBLICDIR}${FileEnum.AD}`),
  limits: { fileSize: fileMaxSize.FILE_MAX_SIZE },
});

adsRoutes.post("/create", upload.single("image"), AdsController.createAd);
adsRoutes.post("/get-ads", AdsController.getAllAds);
adsRoutes.delete("/:id", AdsController.deleteAd);
adsRoutes.post("/update/:id", upload.single("image"), AdsController.updateAd);
adsRoutes.post("/click/:id", AdsController.updateAdClick);
adsRoutes.get("/users-add", AdsController.getAdsBasedOnUser);

export default adsRoutes;
