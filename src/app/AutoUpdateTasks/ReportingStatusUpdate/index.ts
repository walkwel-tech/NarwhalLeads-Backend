import { User } from "../../Models/User";
import { processBatch } from "./processBatch";
import PQueue from 'p-queue';


export async function updateReport(batchSize: number) {
    const mainQueue = new PQueue({ concurrency: 1 });
    const totalUsers = await User.countDocuments();
    const totalPages = Math.ceil(totalUsers / batchSize);

    mainQueue.on('active', () => console.log("Q Active"))
    mainQueue.on('idle', () => console.log("Q Empty"))

    for (let page = 0; page < totalPages; page++) {
        const startIndex = page * batchSize;
         await mainQueue.add(() => processBatch(startIndex, batchSize));
    }
}