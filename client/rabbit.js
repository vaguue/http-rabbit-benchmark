const path = require('path');
const crypto = require('crypto');
const { connect } = require('amqplib');

require('dotenv').config({ path: path.resolve(__dirname, '..', 'setup', '.env') });

const user = process.env.RABBITMQ_DEFAULT_USER;
const password = process.env.RABBITMQ_DEFAULT_PASS;

const timeout = 2000;
const requests = new Map();

async function main() {
  const connection = await connect(`amqp://${user}:${password}@127.0.0.1:5672`);
  const channel = await connection.createChannel();
  await channel.assertQueue(`my-rpc`);

  const cbQueuePromise = channel.assertQueue('', { exclusive: true });

  const consumePromise = cbQueuePromise.then((cbQueue) =>
    channel.consume(cbQueue.queue, async (msg) => {
      const { correlationId } = msg.properties
      const ctx = requests.get(correlationId)
      if (ctx) {
        channel.ack(msg);
        const { resolve, reject, timerId } = ctx
        clearTimeout(timerId)
        requests.delete(correlationId)
        const result = JSON.parse(msg.content)
        if (result.success === true) {
          resolve(result)
        } else {
          reject(result)
        }
      }
    })
  )

  const cbQueue = await cbQueuePromise;
  await consumePromise;

  const cancel = (correlationId) => {
    const { reject, timerId } = requests.get(correlationId)
    clearTimeout(timerId)
    requests.delete(correlationId)
    reject('timeout')
  }

  async function rabbitRpc(queue, message) {
    const correlationId = crypto.randomUUID();
    await channel.assertQueue(queue, { durable: true });

    const timerId = setTimeout(cancel, timeout, correlationId);
    const promise = new Promise((resolve, reject) => {
      requests.set(correlationId, { resolve, reject, timerId })
    });

    await channel.sendToQueue(queue, Buffer.from(JSON.stringify(message)), {
      correlationId: correlationId,
      replyTo: cbQueue.queue,
    });

    return promise
  }

  const N = 4000;

  const getData = () => ({ action: 'index' });

  console.time(`${N} requests`);
  await Promise.all(Array.from({ length: N }, (_, i) => rabbitRpc('my-rpc', getData())));
  console.timeEnd(`${N} requests`);
}

main().catch(console.error);
