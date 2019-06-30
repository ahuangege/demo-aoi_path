import { createApp, Application, Session } from "mydog"
import { map } from "./app/domain/map";

let app = createApp();

let _map_instance: map = null as any

app.configure("area", function () {
    _map_instance = new map(app);
});


app.start();


process.on("uncaughtException", function (err: any) {
    console.log(err)
})


export let map_instance = _map_instance