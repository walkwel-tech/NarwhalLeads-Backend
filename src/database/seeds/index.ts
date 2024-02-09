import { addValidationConfigRecord } from './validationConfigScript';

async function seed() {
  console.log('Seeding database...');
  await addValidationConfigRecord();
  console.log('Database seeding complete.');
}

seed().catch(err => {
  console.error('Error seeding database:', err);
  process.exit(1);
});
