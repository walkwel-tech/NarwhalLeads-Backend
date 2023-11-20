import { Schema , Types} from "mongoose";

const SiteConfigSchema = new Schema({
    roundManagers: [{
        type: Types.ObjectId,
        ref: "User"
    }],
    key:{
        type: String,
        unique: true

    } 
})

export {SiteConfigSchema}