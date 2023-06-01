import { ObjectId } from 'mongodb';
import fs from 'fs';
import { v4 } from 'uuid';
import redisClient from '../utils/redis';
import dbClient from '../utils/db';

class FilesController {
  static async postUpload(req, res) {
    const token = req.headers['x-token'];
    const {
      name, type, parentId, isPublic, data,
    } = req.body;

    const users = dbClient.db.collection('users');
    const files = dbClient.db.collection('files');

    if (!name) {
      return res.status(400).json({ error: 'Missing name' });
    }

    const acceptedTypes = ['folder', 'file', 'image'];
    if (!type || !acceptedTypes.includes(type)) {
      return res.status(400).json({ error: 'Missing type' });
    }

    if (!data && type !== 'folder') {
      return res.status(400).json({ error: 'Missing data' });
    }

    if (parentId) {
      const file = await files.findOne({ _id: new ObjectId(parentId) });
      if (!file) {
        return res.status(400).json({ error: 'Parent not found' });
      }
      if (file && file.type !== 'folder') {
        return res.status(400).json({ error: 'Parent is not a folder' });
      }
    }

    const userId = await redisClient.get(`auth_${token}`);
    const user = await users.findOne({ _id: ObjectId(userId) });

    if (!user) {
      return res.status(401).json({
        error: 'Unauthorized',
      });
    }

    const uploadData = {
      name,
      userId,
      type,
      parentId: parentId ? ObjectId(parentId) : 0,
      isPublic: isPublic || false,
    };

    if (type === 'folder') {
      const newFile = await files.insertOne({ ...uploadData });
      return res.status(201).json({ id: newFile.insertedId, ...uploadData });
    }
    const path = process.env.PATH || '/tmp/files_manager';
    if (!fs.existsSync(path)) {
      fs.mkdirSync(path);
    }
    const localPath = v4();
    const fullPath = `${path}/${localPath}`;
    fs.writeFile(fullPath, data, { encoding: 'base64' }, (err) => {
      if (err) {
        console.log(err);
      }
    });
    const newFile = await files.insertOne({ ...uploadData, localPath: fullPath });
    return res.status(201).json({
      id: newFile.insertedId,
      ...uploadData,
    });
  }
}

export default FilesController;
