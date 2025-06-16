
import { db } from './db';
import { notifications } from '../shared/schema';

async function clearNotifications() {
  console.log('Clearing all notifications from database...');

  try {
    // Delete all notifications
    const result = await db.delete(notifications);
    console.log('Successfully cleared all notifications from the database.');
    
    process.exit(0);
  } catch (error) {
    console.error('Error clearing notifications:', error);
    process.exit(1);
  }
}

clearNotifications();
