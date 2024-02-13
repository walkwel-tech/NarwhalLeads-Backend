import { Types } from "mongoose";
import { crawlSite } from "../../Controllers/SupplierBadges/Actions/crawlSite.action";
import { SupplierLink } from "../../Models/SupplierLink";
import logger from "../../../utils/winstonLogger/logger";

export const updateSupplierLink = async (id: Types.ObjectId) => {
  return new Promise(async (resolve, reject) => {
    try {
      const supplierLink = await SupplierLink.findById(id);
      const hasSpotdiffBadge = await crawlSite(supplierLink?.link as string);
      let res;
      if (hasSpotdiffBadge) {
        res = await SupplierLink.findByIdAndUpdate(id, {
          lastSeen: new Date(),
          lastChecked: new Date(),
        });
      } else {
        res = await SupplierLink.findByIdAndUpdate(id, {
          lastChecked: new Date(),
        });
      }
      logger.info("Updated supplier links", res);
    } catch (err) {
      logger.error("Error while updating supplier link", err);
    }
    resolve("User Updated Successfully");
  });
};
