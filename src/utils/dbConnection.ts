import { connect, connection } from "mongoose";
import logger from "./winstonLogger/logger";

export const connectDatabase = () => {
    if (connection.readyState == 0) {
        connect(process.env.DB_URL as string)
    .then(() => logger.info(`Database connected Successfully`, new Date(), "Today's Date"))
            .catch((err) => logger.error(`Database connection error: `, err, new Date(), "Today's Date"));
    } else {
        return;
    }
};
