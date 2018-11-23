"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var util_1 = require("./app/domain/util");
var x = 1.9, y = 0, path = [{ "x": 2, "y": 0 }, { "x": 2.1, "y": 0 }], updateTime = Date.now(), speed = 100;
function update() {
    var time = (Date.now() - updateTime) / 1000;
    updateTime = Date.now();
    if (path.length > 0) {
        var moveDis = speed * time;
        var oldPos = { "x": x, "y": y };
        var startPos = oldPos;
        var endPos = null;
        var i = 0;
        for (i = 0; i < path.length; i++) {
            var tmp_dis = util_1.getDistance(startPos, path[i]);
            console.log(moveDis, tmp_dis);
            if (moveDis > tmp_dis) {
                moveDis = moveDis - tmp_dis;
                startPos = path[i];
                endPos = startPos;
            }
            else {
                endPos = util_1.getLerpPos(startPos, path[i], moveDis, tmp_dis);
                break;
            }
        }
        console.log("结果： ", i, endPos);
        path.splice(0, i);
        x = endPos.x;
        y = endPos.y;
        console.log("更新: ", path.length, "\n------------------------\n");
    }
}
setInterval(update, 200);
