import { Schema, Types } from "mongoose";
import { RolesEnum } from "../../types/RolesEnum";

const UserSchema = new Schema(
  {
    firstName: {
      type: String,
      required: true,
    },
    lastName: {
      type: String,
      // required: true,
    },
    email: {
      type: String,
      // required: true,
      // unique: true,
    },
    password: {
      type: String,
      // required: true,
    },
    role: {
      type: String,
      required: true,
      default: RolesEnum.USER,
    },
    leadCost: {
      type: Number,
      default: 10,
      required: false,
    },
    phoneNumber: {
      type: String,
      default: null,
    },
    isRyftCustomer: {
      type: Boolean,
      default: false,
      required: false,
    },
    isArchived: {
      type: Boolean,
      default: false,
      required: false,
    },
    isLeadbyteCustomer: {
      type: Boolean,
      default: false,
      required: false,
    },
    buyerId: {
      type: String,
      required: false,
    },
    isXeroCustomer: {
      type: Boolean,
      required: false,
      default: false,
    },
    xeroContactId: {
      type: String,
      required: false,
    },
    credits: {
      type: Number,
      default: 0,
      required: false,
    },
    autoChargeAmount: {
      type: Number,
      required: false,
      default: 100,
    },
    verifiedAt: {
      type: Date,
      default: null,
    },
    isVerified: {
      type: Boolean,
      default: false,
    },
    isActive: {
      type: Boolean,
      default: false,
    },
    activatedAt: {
      type: Date,
      default: null,
    },
    isDeleted: {
      type: Boolean,
      default: false,
    },
    deletedAt: {
      type: Date,
    },
    businessDetailsId: {
      type: Types.ObjectId,
      ref: "BusinessDetails",
      default: null,
    },
    businessIndustryId: {
      type: Types.ObjectId,
      ref: "BuisnessIndustries",
      default: null,
    },
    userLeadsDetailsId: {
      type: Types.ObjectId,
      ref: "UserLeadsDetails",
      default: null,
    },
    invitedById: {
      type: Types.ObjectId,
      ref: "User",
      default: null,
    },
    userServiceId: {
      type: Types.ObjectId,
      ref: "UserService",
      default: null,
    },
    paymentMethod: {
      type: String,
      // default: false,
    },
    rowIndex: {
      type: Number,
      default: 0,
    },
    userNotes: {
      type: String,
      default: "",
    },
    isLeadCostCheck: {
      type: Boolean,
      default: false,
    },
    onBoarding: {
      type: Array,
    },
    isUserSignup: {
      type: Boolean,
      default: false,
    },
    registrationMailSentToAdmin: {
      type: Boolean,
      default: false,
    },
    ryftClientId: {
      type: String,
    },
    premiumUser: {
      type: String,
      default: false,
    },
    promoLinkId: {
      type: Types.ObjectId,
      ref: "FreeCreditsLink",
      default: null,
    },
    isLeadReceived: {
      type: Boolean,
      default: false,
    },
    promoCodeUsed: {
      type: Boolean,
      default: false,
    },
    onBoardingPercentage: {
      type: Number,
      required: false,
    },
    triggerAmount: {
      type: Number,
    },
    isSmsNotificationActive: {
      type: Boolean,
      default: true,
    },
    smsPhoneNumber: {
      type: String,
      default: "",
    },
    isSignUpCompleteWithCredit: {
      type: Boolean,
      default: false,
    },
    isCreditsAndBillingEnabled: {
      type: Boolean,
      default: false,
    },
    accountManager:{
      type: Types.ObjectId,
      ref: "User",
      
    }
  },
  { timestamps: true }
);

export { UserSchema };
