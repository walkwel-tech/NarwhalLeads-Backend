import multer from "multer";
import {Request} from "express";

interface FileInterface {
    fieldname: String,
    originalname: String,
    encoding: String,
    mimetype:String
}

export function storeFile(path: String) {
    const storage = multer.diskStorage({

        destination: function (req: Request, file: FileInterface, cb: Function) {
            cb(null, path)
        },
        filename: function (req: any, file: FileInterface, cb: Function) {
            const fileExtension = file.originalname.split('.')
            cb(null, file.fieldname + '-' + `${Date.now()}.${fileExtension[fileExtension.length - 1]}`)
        }
    });

    return storage;
}