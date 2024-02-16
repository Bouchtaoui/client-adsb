const net = require("net");
const Decoder = require("mode-s-decoder");
const sbs1 = require("sbs1");

const client = new net.Socket();
const port = 30003;
const host = "127.0.0.1";
const decoder = new Decoder();

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

client.connect(port, host, function () {
  console.log("Connected");
  client.write("Connected From Client " + client.address().address);
});

client.on("data", function (data) {
  // console.log(">> " + data);
  
  const msg = sbs1.parseSbs1Message(data.toString());
  if (
    msg.message_type === sbs1.MessageType.TRANSMISSION ||
    msg.transmission_type === sbs1.TransmissionType.ES_AIRBORNE_POS
  ) {
    console.log(
      "Aircraft ID", msg.hex_ident,
      "flight ID: ", msg.flight_id,
      "date: ", msg.logged_date,
      "time: ", msg.logged_time,
      "speed: ",msg.ground_speed,
      "altitude: ",msg.altitude,
      "coords: " + msg.lat + ", " + msg.lon);
  }
});

client.on("close", function () {
  console.log("Connection closed");
});