import { MongoClient } from 'mongodb';

class DBClient {
  constructor() {
    const DB_HOST = process.env.DB_HOST || 'localhost';
    const DB_PORT = process.env.DB_PORT || '27017';
    const DB_NAME = process.env.DB_DATABASE || 'files_manager';

    const url = `mongodb://${DB_HOST}:${DB_PORT}/${DB_NAME}`;
    this.client = new MongoClient(url, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    this.client.connect();
    this.db = this.client.db(DB_NAME);
  }

  isAlive() {
    return this.client.topology.isConnected();
  }

  async nbUsers() {
    try {
      const users = this.db.collection('users');
      return users.countDocuments();
    } catch (err) {
      throw new Error(`${err.message}`);
    }
  }

  async nbFiles() {
    try {
      const files = this.db.collection('files');
      return files.countDocuments();
    } catch (err) {
      throw new Error(`${err.message}`);
    }
  }
}

const dbClient = new DBClient();
export default dbClient;
