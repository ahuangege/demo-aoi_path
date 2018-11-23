"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var app_1 = require("../../../../app");
var handler = /** @class */ (function () {
    function handler(_app) {
        this.app = _app;
    }
    /**
     * 进入游戏
     * @param msg
     * @param session
     * @param next
     */
    handler.prototype.enter = function (msg, session, next) {
        if (!msg.username) {
            return;
        }
        var res = app_1.map_instance.enter(msg.username);
        session.bind(res.mePlayer.uid);
        session.set("id", res.mePlayer.id);
        session.setCloseCb(closed_cb);
        next(res);
    };
    /**
     * 切换移动路线
     * @param msg
     * @param session
     * @param next
     */
    handler.prototype.move = function (msg, session, next) {
        app_1.map_instance.move(msg, session.get("id"));
    };
    /**
     * 拾取物品
     * @param msg
     * @param session
     * @param next
     */
    handler.prototype.pickItem = function (msg, session, next) {
        app_1.map_instance.pickItem(msg.id, session.get("id"));
    };
    return handler;
}());
exports.default = handler;
function closed_cb(app, session) {
    console.log("断开连接: ", session.uid);
    if (!session.uid) {
        return;
    }
    app_1.map_instance.leave(session.get("id"));
}
