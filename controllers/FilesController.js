import redisClient from "../utils/redis";
import dbClient from "../utils/db";

class FilesController {
  static async postUpload(req, res) {
    const token = req.headers['x-token'];
    const {name, type, parentId, isPublic, data} = req.body;

    if(!name) {
      return res.status(400).json({error: 'Missing name'});
    }
    const user = await redisClient.get(`auth_${token}`);

    if (!user) {
      return res.status(401).json({
        error: 'Unauthorized',
      });
    }
    const parsedUser = JSON.parse(user);
  }
}

export default FilesController;
