import { IncomingWebhook } from '@slack/webhook';
 
const webhookURL = process.env.SLACK_WEBHOOK_URL;
const channel = process.env.SLACK_CHANNEL;
 
if(!webhookURL) console.log('Error: SLACK_WEBHOOK_URL is missing in the environment file.')
if(!channel) console.log('Error: SLACK_CHANNEL is missing in the environment file.')
 
const webhook = new IncomingWebhook(webhookURL as string);
 
export const slackWebhook = async (userId: string, intentId: string) => {
    await webhook.send({
        channel: `${channel}`,
        text: `Payment of user ${userId} & intent ID ${intentId} has failed.`
    }).then((response) => {
        console.log(response)
    }).catch((err) => {
        console.log(err)
    })
}