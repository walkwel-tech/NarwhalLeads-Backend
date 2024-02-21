import { ObjectId } from 'mongoose';
import { User } from '../../app/Models/User';
import logger from '../winstonLogger/logger';

async function updateUserSendgridJobIds(userId: ObjectId, jobId: string) {
  try {
    await User.findByIdAndUpdate(userId, { $push: { sendgridJobIds: jobId } });
  } catch (error) {
    logger.error("Error updating user sendgridJobIds:", error);
  }
}

export { updateUserSendgridJobIds };
