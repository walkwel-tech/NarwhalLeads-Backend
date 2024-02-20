import { IncomingWebhook } from '@slack/webhook';
import { UserInterface } from '../../types/UserInterface';
import logger from '../winstonLogger/logger';

function configureSlackWebhooks() {
    const webhookURL = process.env.SLACK_WEBHOOK_URL;
    const channel = process.env.SLACK_CHANNEL;

    const webhook = new IncomingWebhook(webhookURL as string);
    return { channel, webhook };
}

const { channel, webhook } = configureSlackWebhooks();

export const slackWebhook = async ({firstName, lastName, phoneNumber, id}: UserInterface, intentId: string) => {
    return new Promise(async (resolve, reject) => {
        if (!channel || !webhook) {
            logger.error('Error: Slack webhook is not configured.', new Date(), "Today's Date");
            reject('Error: Slack webhook is not configured.');
        }

        await webhook.send({
            channel: `${channel}`,
            text: `We have recently identified a payment failure of user having the following details -->
                    Full Name: ${firstName}
                    Last Name: ${lastName}
                    Mobile Number: ${phoneNumber}
                    User ID: ${id}
                    Intent ID: ${intentId} `
        }).then((response) => {
            logger.info('Slack webhook triggered @', new Date(), JSON.stringify(response));
            resolve(response);
        }).catch((err) => {
            logger.error('There was an error triggering Slack Webhook @', new Date(), JSON.stringify(err));
            reject(err);
        })
    });
}
