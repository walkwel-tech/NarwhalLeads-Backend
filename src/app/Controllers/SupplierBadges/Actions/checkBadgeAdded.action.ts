import { Request, Response } from "express";
import { validate } from "class-validator";
import { CheckBadgeBodyValidator } from "../Inputs/checkBadge.input";
import { crawlSite } from "./crawlSite.action";
import { Transaction } from "../../../Models/Transaction";
import { SupplierLink } from "../../../Models/SupplierLink";
import { UserInterface } from "../../../../types/UserInterface";
import { transactionTitle } from "../../../../utils/Enums/transaction.title.enum";
import { PAYMENT_STATUS } from "../../../../utils/Enums/payment.status";
import { FreeCreditsConfig } from "../../../Models/FreeCreditsConfig";
import { FreeCreditsTitle } from "../../../../utils/Enums/FreeCreditsConstants";
import { addCreditsToBuyer } from "../../../../utils/payment/addBuyerCredit";
import logger from "../../../../utils/winstonLogger/logger";
import { checkAccess } from "../../../Middlewares/serverAccess";

export const checkBadgeAddedAction = async (req: Request, res: Response) => {
  try {
    const { website } = req.body;
    const user = req.user as UserInterface;
    const reqBody = new CheckBadgeBodyValidator();
    reqBody.website = website;

    const validationErrors = await validate(reqBody);

    if (validationErrors.length > 0) {
      return res.status(400).json({
        error: { message: "Invalid request body", validationErrors },
      });
    }

    const freeCredits = await FreeCreditsConfig.findOne({
      tag: FreeCreditsTitle.BADGE_PROMO_ONE,
    });

    if (!freeCredits || !freeCredits.enabled) {
      return res.status(400).json({
        error: {
          message: "Free credits on adding badge is currently disabled",
        },
      });
    }

    // checking if credit already exists
    const isTransactionExisted = await Transaction.findOne({
      userId: user?._id,
      title: transactionTitle.BADGE_CREDITS,
    });
    if (isTransactionExisted) {
      return res.status(400).json({
        error: {
          message: "Free credits already added.",
        },
      });
    }
    // Adding first seen check here.
    let supplierLinkDetail;
    let supplierLinkDetailExist = await SupplierLink.findOne({
      userId: user?._id,
    });
    if (supplierLinkDetailExist) {
      supplierLinkDetail = supplierLinkDetailExist;
    } else {
      supplierLinkDetail = await SupplierLink.create({
        userId: user?._id,
        link: website,
        lastChecked: new Date(),
        //   firstSeen: new Date(),
      });
    }

    const hasSpotDifBadge = await crawlSite(website);
    if (hasSpotDifBadge) {
      let amount = freeCredits.amount * +user?.leadCost;
      // create transaction
      const transaction = await Transaction.create({
        userId: user?._id,
        leadCost: user?.leadCost,
        title: transactionTitle.BADGE_CREDITS,
        status: PAYMENT_STATUS.CAPTURED,
        isCredited: true,
        link: website,
        isDebited: false,
        amount,
      });

      // updating lastseen i.e when badge is seen and addingtransaction id
      await SupplierLink.findByIdAndUpdate(supplierLinkDetail?._id, {
        lastSeen: new Date(),
        lastChecked: new Date(),
        transactionID: transaction?._id,
        firstSeen: new Date(),
        amount: amount,
      });
      if (checkAccess()) {
        await addCreditsToBuyer({
          buyerId: user?.buyerId,
          fixedAmount: amount,
        })
          .then((res) => {
            logger.info("Add credits to buyer success", { res });
          })
          .catch((err) => {
            logger.error("Error in adding credits to buyer", err);
          });
      }
    } else {
      return res.json({
        message: "Badge not found in specified website.",
      });
    }

    return res.json({
      message: "Free credit added Successfully.",
    });
  } catch (err) {
    return res.status(500).json({
      // error: { message: err?.message ?? "Something went wrong.", err },
      // @todo after puppeter fix use above one
      error: { message: "We are looking into it.", err },
    });
  }
};
