import { Request, Response } from "express";
import { BuisnessIndustries } from "../../Models/BuisnessIndustries";
import { SupplierBadge } from "../../Models/SupplierBadge";
import { UserInterface } from "../../../types/UserInterface";
import { BuisnessIndustriesInterface } from "../../../types/BuisnessIndustriesInterface";
import { BusinessDetails } from "../../Models/BusinessDetails";
import { BusinessDetailsInterface } from "../../../types/BusinessInterface";
import { getBadgeAction } from "./Actions/getBadge.action";
import { checkBadgeAddedAction } from "./Actions/checkBadgeAdded.action";
import { getBadgeAddedListAction } from "./Actions/getBadgeAddedList.action";
import { getMyBadgeDetail } from "./Actions/getMyBadgeDetail.action";

export const defaultImagesForType = {
  badge: "https://spotdif.com/media/SpotDif_Partner_Badge.webp",
  banner: "https://spotdif.com/media/SpotDif_Partner_Banner.webp",
  post: "https://spotdif.com/media/SpotDif_Partner_Badge.webp",
};

export class SupplierBadgeController {
  static getBadge = async (req: Request, res: Response) => {
    return getBadgeAction(req, res);
  };

  // TODO to be moved in actions
  static getBadges = async (req: Request, res: Response) => {
    const serverRoute = `${process.env.APP_HOME}supplier-badges`; // this is self-route eg: https://leads.spotdif.com/api/v1/supplier-badges
    const industrySlug = (req.user as UserInterface)?.businessIndustryId;
    const businessSlug = (req.user as UserInterface)?.businessDetailsId;
    const businessIndustry = (await BuisnessIndustries.findById(
      industrySlug
    )) as BuisnessIndustriesInterface;
    const businessDetail = (await BusinessDetails.findById(
      businessSlug
    )) as BusinessDetailsInterface;
    const badges = await SupplierBadge.find({ isActive: true });

    const isDynamicImageEnabled =
      process.env.DYNAMIC_SUPPLIER_BADGES_IMAGES === "true";

    const dynamicImageLinks = {
      badge: `${serverRoute}/badge/${industrySlug}`,
      banner: `${serverRoute}/banner/${industrySlug}`,
      post: `${serverRoute}/post/${industrySlug}`,
    };

    return res.status(200).json({
      badges: badges.map((badge) => {
        const imageUrl = isDynamicImageEnabled
          ? dynamicImageLinks[badge.type]
          : defaultImagesForType[badge.type];
        return {
          ...badge.toObject(),
          imageUrl: imageUrl,
          ...(badge?.contentTitle ? {blogTitle: badge.contentTitle.replace(/{{company}}/g, businessDetail?.businessName)} : {} ),
          codeSnippet: badge.codeSnippet
            .replace(/{{imageUrl}}/g, imageUrl)
            .replace(/{{industry}}/g, businessIndustry?.industry)
            .replace(
              /{{industryUrl}}/g,
              `${process.env.APP_HOME}${businessIndustry?.industry}`
            )
            .replace(/{{company}}/g, businessDetail?.businessName),
        };
      }),
    });
  };

  static evaluateBadgeAdded = (req: Request, res: Response) => {
    return checkBadgeAddedAction(req, res);
  };

  static badgeCreditsList = async (req: Request, res: Response) => {
    return getBadgeAddedListAction(req, res);
  };

  static getMyBadge = async (req: Request, res: Response) => {
    return getMyBadgeDetail(req, res);
  };
}
