import fs from 'fs';
import Queue from 'bull';
import { ObjectId } from 'mongodb';
import imageThumbnail from 'image-thumbnail';
import dbClient from './utils/db';

const queue = new Queue('fileQueue');

queue.process(async (job, done) => {
  const { fileId, userId } = job.data;

  if (!fileId) {
    throw new Error('Missing fileId');
  }
  if (!userId) {
    throw new Error('Missing userId');
  }

  const files = dbClient.db.collection('files');
  const file = await files.findOne({
    _id: ObjectId(fileId),
    userId: ObjectId(userId),
  });
  if (!file) {
    throw new Error('File not found');
  }
  const thumbnail500 = await imageThumbnail(file.localPath, { width: 500 });
  const thumbnail250 = await imageThumbnail(file.localPath, { width: 250 });
  const thumbnail100 = await imageThumbnail(file.localPath, { width: 100 });

  fs.writeFile(`${file.localPath}_500`, thumbnail500, (err) => {
    if (err) {
      throw err;
    }
  });
  fs.writeFile(`${file.localPath}_250`, thumbnail250, (err) => {
    if (err) {
      throw err;
    }
  });
  fs.writeFile(`${file.localPath}_100`, thumbnail100, (err) => {
    if (err) {
      throw err;
    }
  });
  done();
});
