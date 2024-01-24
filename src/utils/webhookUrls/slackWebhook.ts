import { IncomingWebhook } from '@slack/webhook';
import { UserInterface } from '../../types/UserInterface';

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
            console.error('Error: Slack webhook is not configured.', new Date());
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
            console.log('Slack webhook triggered @', new Date(), JSON.stringify(response));
            resolve(response);
        }).catch((err) => {
            console.error('There was an error triggering Slack Webhook @', new Date(), JSON.stringify(err));
            reject(err);
        })
    });
}
