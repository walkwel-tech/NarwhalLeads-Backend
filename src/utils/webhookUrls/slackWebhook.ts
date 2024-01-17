import {IncomingWebhook} from '@slack/webhook';

function configureSlackWebhooks() {
    const webhookURL = process.env.SLACK_WEBHOOK_URL;
    const channel = process.env.SLACK_CHANNEL;

    if (!webhookURL) console.log('Error: SLACK_WEBHOOK_URL is missing in the environment file.')
    if (!channel) console.log('Error: SLACK_CHANNEL is missing in the environment file.')

    const webhook = new IncomingWebhook(webhookURL as string);
    return {channel, webhook};
}

const {channel, webhook} = configureSlackWebhooks();

export const slackWebhook = async (userId: string, intentId: string) => {
    return new Promise(async (resolve, reject) => {
        if (!channel || !webhook) {
            console.error('Error: Slack webhook is not configured.', new Date());
            reject('Error: Slack webhook is not configured.');
        }

        await webhook.send({
            channel: `${channel}`,
            text: `Payment of user ${userId} & intent ID ${intentId} has failed.`
        }).then((response) => {
            console.log('Slack webhook triggered @', new Date(), JSON.stringify(response));
            resolve(response);
        }).catch((err) => {
            console.error('There was an error triggering Slack Webhook @', new Date(), JSON.stringify(err));
            reject(err);
        })
    });
}
