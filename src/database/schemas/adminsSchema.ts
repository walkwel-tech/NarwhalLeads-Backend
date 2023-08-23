import { Schema } from "mongoose";
import { RolesEnum } from "../../types/RolesEnum";

const AdminSchema = new Schema({
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
    },
    role:{
        type:String,
        default:RolesEnum.ADMIN
    },
    isDeleted:{
        type:Boolean,
        default:false
    }
}, {timestamps: true});

export {AdminSchema };
