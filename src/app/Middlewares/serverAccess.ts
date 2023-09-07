import { APP_ENV } from "../../utils/Enums/serverModes.enum"

export function checkAccess(){
    if(process.env.APP_ENV===APP_ENV.PRODUCTION){
        return true
    }
    else{
        return false
    }
}