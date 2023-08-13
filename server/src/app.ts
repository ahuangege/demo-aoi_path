import { createApp } from "mydog"
let app = createApp();

import { map } from "./app/domain/map";
import { onUserLeave } from "./servers/area/handler/main";


let _map_instance: map = null as any

app.setConfig("connector", { interval: 30, clientOffCb: onUserLeave })

app.configure("area", function () {
    _map_instance = new map(app);
});


app.start();


process.on("uncaughtException", function (err: any) {
    console.log(err)
})


export let map_instance = _map_instance