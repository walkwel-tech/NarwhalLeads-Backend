import * as cron from "node-cron";
import logger from "../../utils/winstonLogger/logger";
import {UserInterface} from "../../types/UserInterface";
import {POST} from "../../utils/constantFiles/HttpMethods";

import {APP_ENV} from "../../utils/Enums/serverModes.enum";
import {cmsUpdateWebhook} from "../../utils/webhookUrls/cmsUpdateWebhook";
import {User} from "../Models/User";


export const cronBuyerStatus = async () => {
    let cronTiming =
        (
            (process.env.APP_ENV == APP_ENV.STAGING)
            || (process.env.APP_ENV == APP_ENV.DEVELOPMENT)
        )
            ? "*/30 * * * *"
            : "25 7 * * *";

    cron.schedule(cronTiming, checkBuyersStatusAndSync);
};

export const checkBuyersStatusAndSync = async () => {
    logger.info("buyer sync initiated!");
    const allBuyers = await User.find({
        buyerId: {$exists: true},
        isDeleted: false,
    }, {
        buyerId: 1,
        credits: 1,
    });

    // Chunk all buyers to 1000
    const chunkedBuyers = chunkArray(allBuyers, 100);
    logger.info(`buyer sync has found ${allBuyers.length} buyers and chunked them ${chunkedBuyers.length}`);

    await Promise.all(chunkedBuyers.map(async (buyers: UserInterface[], index: number) => {
        const buyersToStatus = buyers.reduce((acc: any, buyer: UserInterface) => {
            acc[buyer.buyerId] = (buyer.credits > 0);
            return acc;
        }, {});

        logger.debug(`buyer sync #${index} sending data to cms`, buyersToStatus.length, buyersToStatus);

        return cmsUpdateWebhook("data/buyerSync", POST, {
            data: buyersToStatus
        }).then((res) => {
            logger.info(`buyer sync #${index} completed`, buyersToStatus.length, res);
        }).catch((err) => {
            logger.error(`buyer sync #${index} failed`, buyersToStatus.length, err);
        });
    }));

    logger.info("buyer sync completed!");
}

const chunkArray = (original: any[], chunkSize: number) => {
    let index = 0;
    let arrayLength = original.length;
    let chunks = [];

    for (index = 0; index < arrayLength; index += chunkSize) {
        let myChunk = original.slice(index, index + chunkSize);
        chunks.push(myChunk);
    }

    return chunks;
}
