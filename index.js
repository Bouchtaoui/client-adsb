const net = require("net");
const Decoder = require("mode-s-decoder");
const sbs1 = require("sbs1");
const { createClient } = require("redis");

const client = new net.Socket();
const port = 30003;
const host = "127.0.0.1";
const decoder = new Decoder();

const redisClient = createClient();

redisClient.connect();
redisClient.on("error", (err) => console.log("Redis Client Error", err));
redisClient.on("connect", () => {
  // connect with dump1090
  client.connect(port, host, function () {
    console.log("Connected with Redis");
    client.write("Connected From Client " + client.address().address);
  });
});

const subscriber = redisClient.duplicate();
const publisher = redisClient.duplicate();

(async () => {
  try {
    await subscriber.connect();
    console.log("Subscriber connected!");

    await publisher.connect();
    console.log("Publisher connected!");
  } catch (error) {
    console.log("Pub/Sub: ", error);
  }

  try {
    await subscriber.subscribe("airplane", (plane) => {
      console.log(JSON.parse(plane));
    });
    console.log("Pub/Sub subscribed!");
  } catch (error) {
    console.log("Subscribing: ", error);
  }
})();

function extractString(message) {
  //   const yetAnotherString = "MyLongString:StringIWant;";
  const regexPattern = /\*(.*?);/;
  const match = message.match(regexPattern);
  const result = match ? match[1] : ""; // Handle cases where no match is found
  console.log(result); // Output: 'StringIWant'
}
function toByteArray(str) {
  Buffer.from(str, "hex");
}

client.on("data", function (data) {
  // console.log(">> " + data);

  const msg = sbs1.parseSbs1Message(data.toString());
  if (
    msg.message_type === sbs1.MessageType.TRANSMISSION ||
    msg.transmission_type === sbs1.TransmissionType.ES_AIRBORNE_POS
  ) {
    //   console.log(
    //     "Aircraft ID", msg.hex_ident,
    //     "flight ID: ", msg.flight_id,
    //     "date: ", msg.logged_date,
    //     "time: ", msg.logged_time,
    //     "speed: ",msg.ground_speed,
    //     "altitude: ",msg.altitude,
    //     "coords: " + msg.lat + ", " + msg.lon);
    updateRedis(msg);
    // console.log(msg);
  }
});

client.on("close", function () {
  console.log("Connection closed");
});

async function updateRedis(msg) {
  // find object based on hex_id
  const json = await redisClient.get(msg.hex_ident);
  if (!json) {
    await redisClient.set(msg.hex_ident, JSON.stringify(msg));
    return;
  }
  const plane = JSON.parse(json);

  for (const key in msg) {
    if (!["message_type", "transmission_type", "hex_ident"].includes(key)) {
      if (msg[key]) plane[key] = msg[key];
    }
  }
  await redisClient.set(msg.hex_ident, JSON.stringify(plane));

  if(msg.lat) publishMsg(plane);

  // console.log(plane);
}

async function publishMsg(msg) {
  if (publisher.isReady) await publisher.publish("airplane", JSON.stringify(msg));
}
