import { ObjectId } from 'mongodb';
import fs from 'fs';
import { v4 } from 'uuid';
import mime from 'mime-types';
import Queue from 'bull';
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
    const newFile = await files.insertOne({
      ...uploadData,
      localPath: fullPath,
    });
    if (type === 'image') {
      const queue = new Queue('fileQueue');
      queue.add({ fileId: newFile.insertedId, userId });
    }
    return res.status(201).json({
      id: newFile.insertedId,
      ...uploadData,
    });
  }

  static async getShow(req, res) {
    const token = req.headers['x-token'];
    const userId = await redisClient.get(`auth_${token}`);
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    const users = dbClient.db.collection('users');
    const user = await users.findOne({ _id: ObjectId(userId) });

    if (!user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    const fileId = req.params.id;
    const files = dbClient.db.collection('files');
    const file = await files.findOne(
      { _id: ObjectId(fileId), userId: user._id },
      {
        projection: {
          id: '$_id',
          _id: 0,
          name: 1,
          type: 1,
          isPublic: 1,
          parentId: 1,
          userId: 1,
        },
      },
    );
    if (file) {
      return res.status(200).json(file);
    }
    return res.status(404).json({ error: 'Not found' });
  }

  static async getIndex(req, res) {
    const token = req.headers['x-token'];
    const userId = await redisClient.get(`auth_${token}`);
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    const users = dbClient.db.collection('users');
    const user = await users.findOne({ _id: ObjectId(userId) });

    if (!user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { parentId } = req.query;
    const page = req.query.page || 0;
    const files = dbClient.db.collection('files');
    let filter;

    if (parentId) {
      filter = { parentId: ObjectId(parentId), userId };
    } else {
      filter = { userId };
    }
    const resultArray = await files
      .aggregate([
        { $match: filter },
        { $skip: parseInt(page, 10) * 20 },
        { $limit: 20 },
        {
          $project: {
            id: '$_id',
            _id: 0,
            name: 1,
            type: 1,
            isPublic: 1,
            parentId: 1,
            userId: 1,
          },
        },
      ])
      .toArray();
    return res.status(200).json(resultArray);
  }

  static async putPublish(req, res) {
    const token = req.headers['x-token'];
    const userId = await redisClient.get(`auth_${token}`);
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    const users = dbClient.db.collection('users');
    const user = await users.findOne({ _id: ObjectId(userId) });

    if (!user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    const fileId = req.params.id;
    const files = dbClient.db.collection('files');
    const update = {
      $set: {
        isPublic: true,
      },
    };
    const fileToUpdate = await files.findOneAndUpdate(
      { _id: ObjectId(fileId), userId: ObjectId(user._id) }, update,
    );
    if (!fileToUpdate.value) {
      return res.status(404).json({ error: 'Not found' });
    }
    const result = { id: fileToUpdate.value._id, ...fileToUpdate.value, isPublic: true };
    delete result.localPath;
    delete result._id;
    return res.status(200).json(result);
  }

  static async putUnpublish(req, res) {
    const token = req.headers['x-token'];
    const userId = await redisClient.get(`auth_${token}`);
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    const users = dbClient.db.collection('users');
    const user = await users.findOne({ _id: ObjectId(userId) });

    if (!user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    const fileId = req.params.id;
    const files = dbClient.db.collection('files');
    const update = {
      $set: {
        isPublic: false,
      },
    };
    const fileToUpdate = await files.findOneAndUpdate(
      { _id: ObjectId(fileId), userId: ObjectId(user._id) }, update,
    );
    if (!fileToUpdate.value) {
      return res.status(404).json({ error: 'Not found' });
    }
    const result = { id: fileToUpdate.value._id, ...fileToUpdate.value, isPublic: false };
    delete result.localPath;
    delete result._id;
    return res.status(200).json(result);
  }

  static async getFile(req, res) {
    const fileId = req.params.id;
    const files = dbClient.db.collection('files');
    const file = await files.findOne({ _id: ObjectId(fileId) });
    if (!file) {
      return res.status(404).json({ error: 'Not found' });
    }
    const token = req.headers['x-token'];
    const userId = await redisClient.get(`auth_${token}`);
    const users = dbClient.db.collection('users');
    const user = await users.findOne({ _id: ObjectId(userId) });

    if ((!userId || !user || file.userId.toString() !== userId) && !file.isPublic) {
      return res.status(404).json({ error: 'Not found' });
    }

    if (file.type === 'folder') {
      return res.status(400).json({ error: "A folder doesn't have content" });
    }

    if (!fs.existsSync(file.localPath)) {
      return res.status(404).json({ error: 'Not found' });
    }
    let path = file.localPath;
    const { size } = req.query;

    if (size) {
      path = `${file.localPath}_${size}`;
    }
    const contentType = mime.contentType(file.name);
    try {
      const data = await fs.promises.readFile(path);
      return res.header('Content-Type', contentType).status(200).send(data);
    } catch (err) {
      return res.status(404).json({ error: 'Not found' });
    }
  }
}

export default FilesController;
