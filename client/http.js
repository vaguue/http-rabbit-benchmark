const axios = require('axios');

const N = 4000;

const getData = () => ({ action: 'index' });

const request = async () => {
  const resp = await axios.post('http://localhost:3000/rpc', getData());
  return resp;
}

async function main() {
  console.time(`${N} requests`);
  await Promise.all(Array.from({ length: N }, (_, i) => request()));
  console.timeEnd(`${N} requests`);
}

main().catch(console.error);
