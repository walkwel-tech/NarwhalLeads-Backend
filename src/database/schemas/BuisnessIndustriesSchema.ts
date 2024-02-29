import { Schema } from "mongoose";
import { json } from "../../utils/constantFiles/businessIndustryJson";
import { defaultImagesForType } from "../../app/Controllers/SupplierBadges";

const BuisnessIndustriesSchema = new Schema(
  {
    industry: {
      type: String,
    },
    avgConversionRate: {
      type: Number,
    },
    leadCost: {
      type: Number,
    },
    columns: {
      type: Array,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    json: {
      type: Object,
      default: json,
    },
    isDeleted: {
      type: Boolean,
      default: false,
    },
    deletedAt: {
      type: Date,
    },
    associatedCurrency: {
      type: String,
    },
    country: {
      type: String,
    },
    supplierBadges: {
      type: [
        {
          src: {
            type: String,
            required: true,
          },
          type: {
            type: String,
            enum: ["badge", "banner", "post"],
            required: true,
          },
          altText: {
            type: String,
          },
        },
      ],
      default: [
        { type: "badge", src: defaultImagesForType.badge, altText: "BADGE" },
        { type: "banner", src: defaultImagesForType.banner, altText: "BANNER" },
        { type: "post", src: defaultImagesForType.post, altText: "POST" },
      ],
    },
    minimumTopupLeads: {
      type: Number,
    },
  },
  { timestamps: true }
);
export { BuisnessIndustriesSchema };
