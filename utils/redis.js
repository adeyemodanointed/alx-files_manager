import { createClient } from 'redis';

class RedisClient {
  constructor () {
    this.client = createClient();

    this.client.on('error', (err) => {
      console.log(err);
    });
  }

  isAlive () {
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

  async get (key) {
    this.client.get(key, (err, result) => {
      if (err) {
        console.log(err);
        throw err;
      }
      return result;
    });
  }

  async set (key, value, duration) {
    this.client.setex(key, duration, value, (err) => {
      if (err) {
        console.error(err);
      }
    });
  }

  async del (key) {
    this.client.del(key, (err) => {
      if (err) {
        console.error(err);
      }
    });
  }
}

const redisClient = new RedisClient();
export default redisClient;
