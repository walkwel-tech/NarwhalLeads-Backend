import { Schema, Types } from "mongoose";

const AdSchema = new Schema(
    {
        industries: {
            type: [Types.ObjectId],
            ref: "BuisnessIndustries"
        },
        image: String,
        title: String,
        callToAction: String,
        description: String,
        buttonText: String,
        startDate: Date,
        endDate: Date,
        targetReach: Number,
        isTargetReachedEnable: {
            type:Boolean,
            default: false
        },
        clickTotal: {
            type: Number,
            default: 0
        },
        isDeleted: {
            type: Boolean,
            default: false
        },
        isActive: {
            type: Boolean,
            default: true
        }
    }, {
    timestamps: true
}
)

export { AdSchema }