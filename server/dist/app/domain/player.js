"use strict";
var __extends = (this && this.__extends) || (function () {
    var extendStatics = Object.setPrototypeOf ||
        ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
        function (d, b) { for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p]; };
    return function (d, b) {
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
var entity_1 = require("./entity");
var util_1 = require("./util");
var player = /** @class */ (function (_super) {
    __extends(player, _super);
    function player(opts) {
        var _this = _super.call(this, { "type": entity_1.entity_type.player, "x": opts.x, "y": opts.y }) || this;
        _this.path = [];
        _this.speed = 2;
        _this.updateTime = Date.now();
        _this.range = 0;
        _this.needMove = true;
        _this.uid = opts.uid;
        _this.username = opts.username;
        _this.map = opts.map;
        _this.range = opts.range;
        _this.speed = opts.speed;
        return _this;
    }
    player.prototype.update = function () {
        this.needMove = !this.needMove;
        if (!this.needMove) {
            return;
        }
        var time = (Date.now() - this.updateTime) / 1000;
        this.updateTime = Date.now();
        if (this.path.length > 0) {
            var moveDis = this.speed * time;
            var oldPos = { "x": this.x, "y": this.y };
            var startPos = oldPos;
            var endPos = null;
            var i = 0;
            for (i = 0; i < this.path.length; i++) {
                var tmp_dis = util_1.getDistance(startPos, this.path[i]);
                if (moveDis > tmp_dis) {
                    moveDis = moveDis - tmp_dis;
                    startPos = this.path[i];
                    endPos = startPos;
                }
                else {
                    endPos = util_1.getLerpPos(startPos, this.path[i], moveDis, tmp_dis);
                    break;
                }
            }
            this.path.splice(0, i);
            this.x = endPos.x;
            this.y = endPos.y;
            var obj = { "id": this.id, "type": entity_1.entity_type.player };
            this.map.towerAOI.updateWatcher(obj, oldPos, endPos, this.range, this.range);
            this.map.towerAOI.updateObject(obj, oldPos, endPos);
        }
    };
    player.prototype.toJSON = function () {
        return {
            id: this.id,
            type: this.type,
            x: Number(this.x.toFixed(2)),
            y: Number(this.y.toFixed(2)),
            username: this.username,
            uid: this.uid,
            path: this.path,
            speed: this.speed
        };
    };
    return player;
}(entity_1.entity));
exports.player = player;
