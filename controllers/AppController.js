import redisClient from '../utils/redis';
import dbClient from '../utils/db';

class AppController {
  static async getStatus(req, res) {
    const dbAlive = dbClient.isAlive();
    const redisAlive = redisClient.isAlive();

    return res.status(200).json({
      redis: redisAlive,
      db: dbAlive,
    });
  }

  static async getStats(req, res) {
    const userCount = await dbClient.nbUsers();
    const fileCount = await dbClient.nbFiles();
    return res.status(200).json({ users: userCount, files: fileCount });
  }
}

export default AppController;
