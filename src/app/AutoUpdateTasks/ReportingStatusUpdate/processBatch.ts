// const PQueueModule = await import('p-queue');
import PQueue from "p-queue";
import { User } from "../../Models/User";
import { processUsers } from "./processUser";
import logger from "../../../utils/winstonLogger/logger";

export async function processBatch(startIndex: number, batchSize: number) {
  const nestedQueue = new PQueue({ concurrency: 10 });

  nestedQueue.on("next", () => logger.debug(`Next on NQ ${startIndex}`));

  const batch = await User.find({})
    .select("_id")
    .skip(startIndex)
    .limit(batchSize);
  batch.forEach((user) => nestedQueue.add(() => processUsers(user._id)));
}
