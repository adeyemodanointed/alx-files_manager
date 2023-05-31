import { createClient } from 'redis';
import { promisify } from 'util';

class RedisClient {
  constructor() {
    this.client = createClient();

    this.client.on('error', (err) => {
      console.log(err);
    });
  }

  isAlive() {
    // return this.client.ping((err, response) => {
    //   console.log(response);
    //   if (response === "PONG") {
    //     return true;
    //   } else {
    //     return false;
    //   }
    // });
    return this.client.connected;
  }

  async get(key) {
    const getAsync = promisify(this.client.get).bind(this.client);
    const value = await getAsync(key);
    return value;
  }

  async set(key, value, duration) {
    this.client.setex(key, duration, value, (err) => {
      if (err) {
        console.error(err);
      }
    });
  }

  async del(key) {
    this.client.del(key, (err) => {
      if (err) {
        console.error(err);
      }
    });
  }
}

const redisClient = new RedisClient();
export default redisClient;
