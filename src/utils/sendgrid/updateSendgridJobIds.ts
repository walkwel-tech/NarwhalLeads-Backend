import { ObjectId } from 'mongoose';
import { User } from '../../app/Models/User';
async function updateUserSendgridJobIds(userId: ObjectId, jobId: string) {
  try {
    await User.findByIdAndUpdate(userId, { $push: { sendgridJobIds: jobId } });
  } catch (error) {
    console.error("Error updating user sendgridJobIds:", error);
  }
}

export { updateUserSendgridJobIds };
