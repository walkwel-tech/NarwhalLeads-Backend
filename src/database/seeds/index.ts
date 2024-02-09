import { addValidationConfigRecord } from './validationConfigScript';
import { updatePermissionsForUsers } from './updateUserPermissionScript';

async function seed() {
  console.log('Seeding database...');
  await addValidationConfigRecord();
  await updatePermissionsForUsers();
  console.log('Database seeding complete.');
}

seed().catch(err => {
  console.error('Error seeding database:', err);
  process.exit(1);
});

