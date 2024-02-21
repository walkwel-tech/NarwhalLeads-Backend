import { User } from "../../Models/User";
import { processBatch } from "./processBatch";
import PQueue from 'p-queue';
import logger from "../../../utils/winstonLogger/logger";

export async function updateReport(batchSize: number) {
    const mainQueue = new PQueue({ concurrency: 1 });
    const totalUsers = await User.countDocuments();
    const totalPages = Math.ceil(totalUsers / batchSize);

    mainQueue.on('active', () => logger.debug("Q Active"))
    mainQueue.on('idle', () => logger.debug("Q Empty"))

    for (let page = 0; page < totalPages; page++) {
        const startIndex = page * batchSize;
         await mainQueue.add(() => processBatch(startIndex, batchSize));
    }
}