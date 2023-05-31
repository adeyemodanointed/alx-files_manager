import sha1 from 'sha1';
import dbClient from '../utils/db';

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
}

export default UsersController;
