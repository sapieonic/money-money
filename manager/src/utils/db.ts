import mongoose from 'mongoose';

let cachedConnection: typeof mongoose | null = null;

export const connectToDatabase = async (): Promise<typeof mongoose> => {
  if (cachedConnection) {
    return cachedConnection;
  }

  const mongoUri = process.env.MONGODB_URI;
  const dbName = process.env.MONGODB_DB_NAME || 'money-tracker';

  if (!mongoUri) {
    throw new Error('MONGODB_URI environment variable is not set');
  }

  try {
    cachedConnection = await mongoose.connect(mongoUri, {
      bufferCommands: false,
      dbName,
    });

    console.log(`Connected to MongoDB database: ${dbName}`);
    return cachedConnection;
  } catch (error) {
    console.error('MongoDB connection error:', error);
    throw error;
  }
};
