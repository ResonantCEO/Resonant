
import { db } from './db';
import { conversations, conversationParticipants, messages, messageReads } from '../shared/schema';

async function clearMessages() {
  console.log('Clearing all messages, conversations, and related data...');

  try {
    // Delete message reads first (references messages)
    const messageReadsResult = await db.delete(messageReads);
    console.log('Cleared all message reads from database');

    // Delete all messages (references conversations)
    const messagesResult = await db.delete(messages);
    console.log('Cleared all messages from database');

    // Delete conversation participants (references conversations)
    const participantsResult = await db.delete(conversationParticipants);
    console.log('Cleared all conversation participants from database');

    // Delete all conversations
    const conversationsResult = await db.delete(conversations);
    console.log('Cleared all conversations from database');
    
    console.log('Successfully cleared all messages and conversations from the database.');
    console.log('Database is now clean of all messaging data.');
    
    process.exit(0);
  } catch (error) {
    console.error('Error clearing messages:', error);
    process.exit(1);
  }
}

clearMessages();
