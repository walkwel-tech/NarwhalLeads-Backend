import { addValidationConfigRecord } from './validationConfigScript';
import { updatePermissionsForUsers } from './updateUserPermissionScript';
import logger from '../../utils/winstonLogger/logger';

async function seed() {
  logger.info('Seeding database...');
  await addValidationConfigRecord();
  await updatePermissionsForUsers();
  logger.info('Database seeding complete.');
}

seed().catch(err => {
  logger.error('Error seeding database:', err, new Date(), "Today's Date");
  process.exit(1);
});

