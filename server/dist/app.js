"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var mydog_1 = require("mydog");
var map_1 = require("./app/domain/map");
var app = mydog_1.createApp();
app.set("encodeDecodeConfig", { "encode": null, "decode": decode });
var _map_instance = null;
app.configure("area", function () {
    app.set("connectorConfig", { connector: "net", heartbeat: 6 });
    _map_instance = new map_1.map(app);
});
app.start();
process.on("uncaughtException", function (err) {
    console.log(err);
});
function decode(cmdId, msgBuf) {
    console.log(new Date().toLocaleString(), app.routeConfig[cmdId]);
    return JSON.parse(msgBuf);
}
exports.map_instance = _map_instance;
