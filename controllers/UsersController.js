import sha1 from 'sha1';
import { ObjectId } from 'mongodb';
import dbClient from '../utils/db';
import redisClient from '../utils/redis';

class UsersController {
  static async postNew(req, res) {
    const { email, password } = req.body;

    if (!email) {
      return res.status(400).json({
        error: 'Missing email',
      });
    } if (!password) {
      return res.status(400).json({
        error: 'Missing password',
      });
    }

    const users = dbClient.db.collection('users');
    const emailCheck = await users.findOne({ email });
    if (emailCheck) {
      return res.status(400).json({
        error: 'Already exist',
      });
    }
    const hashedPw = sha1(password);
    const newUser = await users.insertOne({ email, password: hashedPw });
    console.log(newUser);
    return res.status(201).json({
      id: newUser.insertedId,
      email,
    });
  }

  static async getMe(req, res) {
    const token = req.headers['x-token'];
    const userId = await redisClient.get(`auth_${token}`);

    if (!userId) {
      return res.status(401).json({
        error: 'Unauthorized',
      });
    }
    const userDb = dbClient.db.collection('users');
    const user = await userDb.findOne({ _id: new ObjectId(userId) });
    if (user) {
      return res.status(200).json({
        id: user._id,
        email: user.email,
      });
    }
    return res.status(401).json({
      error: 'Unauthorized',
    });
  }
}

export default UsersController;
