import { createApp, Application, Session } from "mydog"
import { map } from "./app/domain/map";

let app = createApp();

app.set("encodeDecodeConfig", { "encode": null, "decode": decode });

let _map_instance: map = null as any

app.configure("area", function () {
    app.set("connectorConfig", { connector: "net", heartbeat: 6 });
    _map_instance = new map(app);
});


app.start();


process.on("uncaughtException", function (err: any) {
    console.log(err)
})

function decode(cmdId: number, msgBuf: Buffer): any {
    console.log(new Date().toLocaleString(), app.routeConfig[cmdId]);
    return JSON.parse(msgBuf as any);
}


export let map_instance = _map_instance