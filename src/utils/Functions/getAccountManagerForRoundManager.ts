import { SiteConfig } from "../../app/Models/SiteConfig";
import { ROUND_TABLE_MANAGER } from "../constantFiles/siteConfig";
import logger from "../winstonLogger/logger";

export const getAccountManagerForRoundManager = async () => {
  try {
    const managers = await SiteConfig.find({ key: ROUND_TABLE_MANAGER });
    let updatedArray = managers[0]?.roundManagers;
    let id = updatedArray.shift();
    if (id) {
      updatedArray.push(id);
    }
    await SiteConfig.updateOne(
      { _id: managers[0]._id },
      {
        $set: {
          roundManagers: updatedArray,
        },
      }
    );

    return id;
  } catch (err) {
    logger.error("Error:", err);
  }
  return;
};
