import mongoose from 'mongoose';

import envVar from '../configs/config.js';

mongoose.set('strictQuery', true);

const connectToDb = async () => {
  try {

    const { connection } = await mongoose.connect(envVar.mongoUri);
    if (connection) {
      console.log(`connected to mongoDb${connection.host} port${connection.port} and connection name ${connection.name}`);
    }
    return connection;
  } catch (error) {
    console.log('error while connecting to db', error);
    process.exit(1);
  }

};

export default connectToDb;