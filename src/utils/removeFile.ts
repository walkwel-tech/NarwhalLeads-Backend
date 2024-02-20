import * as fs from "fs"
import { FileEnum } from "../types/FileEnum";
import logger from "./winstonLogger/logger";

import path from "path";
export function DeleteFile(filePath: String): Boolean {
    try {
        if (fs.existsSync(path.join(`${process.cwd()}${FileEnum.PUBLICDIR}${filePath}`))) {
            fs.unlinkSync(path.join(`${process.cwd()}${FileEnum.PUBLICDIR}${filePath}`));
            return true;
        } else {
            return true;
        }
    } catch (err) {
        logger.error('Error:', err, new Date, "Today's Date");
        return false;
    }
}
