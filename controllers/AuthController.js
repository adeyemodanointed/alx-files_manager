import sha1 from 'sha1';
import { v4 } from 'uuid';
import dbClient from '../utils/db';
import redisClient from '../utils/redis';

class AuthController {
  static async getConnect(req, res) {
    console.log(req.headers);
    const { authorization } = req.headers;
    const encodedCredentials = authorization.replace('Basic ', '');
    const decodedAuth = Buffer.from(encodedCredentials, 'base64').toString(
      'utf-8',
    );
    const authArray = decodedAuth.split(':');
    const email = authArray[0];
    const password = authArray[1];

    const User = dbClient.db.collection('users');
    const user = await User.findOne({ email });
    if (user && sha1(password) === user.password) {
      const token = v4();
      const key = `auth_${token}`;
      const resp = await redisClient.set(key, JSON.stringify(user), 24 * 60 * 60);
      console.log(resp);
      return res.status(200).json({ token });
    }
    return res.status(401).json({ error: 'Unauthorized' });
  }

  static async getDisconnect(req, res) {
    const token = req.headers['x-token'];
    const user = await redisClient.get(`auth_${token}`);
    if (!user) {
      return res.status(401).json({
        error: 'Unauthorized',
      });
    }
    await redisClient.del(`auth_${token}`);
    return res.status(204).send();
  }
}

export default AuthController;
