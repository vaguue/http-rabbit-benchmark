const path = require('path');
const { connect } = require('amqplib');

require('dotenv').config({ path: path.resolve(__dirname, '..', 'setup', '.env') });

const user = process.env.RABBITMQ_DEFAULT_USER;
const password = process.env.RABBITMQ_DEFAULT_PASS;

async function init() {
  const connection = await connect(`amqp://${user}:${password}@127.0.0.1:5672`);
  const channel = await connection.createChannel();
  await channel.assertQueue(`my-rpc`);

  await channel.consume(`my-rpc`, async (message) => {
    const answer = {
      success: true,
      data: {},
      message: null,
    };

    channel.ack(message);

    await channel.sendToQueue(message.properties.replyTo, Buffer.from(JSON.stringify(answer)), {
      correlationId: message.properties.correlationId,
    });
  });

  console.log('[*] setted up');
}

init().catch(console.error);
