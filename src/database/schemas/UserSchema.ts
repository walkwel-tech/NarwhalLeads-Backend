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
      required: true,
    },
    email: {
      type: String,
      required: true,
      // unique: true,
    },
    password: {
      type: String,
      required: true,
    },
    role: {
      type: String,
      required: true,
      default: RolesEnum.USER,
    },
    autoCharge: {
      type: Boolean,
      required: false,
    },
    leadCost: {
      type: Number,
      default: 10,
      required: false,
    },
    isRyftCustomer: {
      type: Boolean,
      default: false,
      required: false,
    },
    isArchived:{
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
    xeroContactId: {
      type: String,
      required: false,
    },
    credits: {
      type: Number,
      default: 0,
      required: false,
    },
    signUpFlowStatus:{
      type:String
    },
    autoChargeAmount: {
      type: Number,
      required: false,
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
    businessIndustryId:{
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
    isLeadCostCheck:{
      type: Boolean,
      default: true,
    }
  },
  { timestamps: true }
);

export { UserSchema };
