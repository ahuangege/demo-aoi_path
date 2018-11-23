"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
var player_1 = require("./player");
var item_1 = require("./item");
var entity_1 = require("./entity");
var tower_aoi_1 = require("tower-aoi");
var aoiEventManager_1 = require("./aoiEventManager");
var a_star_pathfind_1 = __importDefault(require("a-star-pathfind"));
var util_1 = require("./util");
var tower_range;
(function (tower_range) {
    tower_range[tower_range["player"] = 2] = "player";
})(tower_range || (tower_range = {}));
var map = /** @class */ (function () {
    function map(app) {
        this.width = 150;
        this.height = 80;
        this.towerWidth = 10;
        this.towerHeight = 5;
        this.tileWidth = 1;
        this.uid_now = 0;
        this.entities = {};
        this.obstacles = [];
        this.app = app;
        this.towerAOI = new tower_aoi_1.TowerAOI({ width: this.width, height: this.height, towerWidth: this.towerWidth, towerHeight: this.towerHeight });
        var arr = [];
        for (var i = 0; i < Math.ceil(this.height / this.tileWidth); i++) {
            arr[i] = [];
            for (var j = 0; j < Math.ceil(this.width / this.tileWidth); j++) {
                if (Math.random() < 0.005) {
                    arr[i][j] = 0;
                    this.obstacles.push({ "x": j, "y": i });
                }
                else {
                    arr[i][j] = 1;
                }
            }
        }
        this.pathFind = new a_star_pathfind_1.default();
        this.pathFind.init(arr);
        aoiEventManager_1.addEvent(this, this.towerAOI);
        setInterval(this.update.bind(this), 100);
        this.initItems();
    }
    map.prototype.initItems = function () {
        for (var i = 0; i < Math.ceil(this.height / this.towerHeight); i++) {
            for (var j = 0; j < Math.ceil(this.width / this.towerWidth); j++) {
                var randNum = Math.floor(Math.random() * 5);
                for (var k = 0; k < randNum; k++) {
                    var posX = j * this.towerWidth + Math.random() * this.towerWidth;
                    var posy = i * this.towerHeight + Math.random() * this.towerHeight;
                    var tmp = new item_1.item({ "x": posX, "y": posy });
                    this.entities[tmp.id] = tmp;
                    this.towerAOI.addObject({ "id": tmp.id, "type": entity_1.entity_type.item }, { "x": posX, "y": posy });
                }
            }
        }
    };
    map.prototype.update = function () {
        for (var id in this.entities) {
            this.entities[id].update();
        }
    };
    /**
     * 玩家进入场景
     * @param username
     */
    map.prototype.enter = function (username) {
        var uid = ++this.uid_now;
        var one = new player_1.player({
            "uid": uid,
            "username": username,
            "x": Math.random() * this.width,
            "y": Math.random() * this.height,
            "map": this,
            "speed": 4,
            "range": tower_range.player
        });
        this.entities[one.id] = one;
        var ids = this.towerAOI.getIdsByPos({ "x": one.x, "y": one.y }, one.range);
        var entities = this.getEntitiesJSON(ids).entities;
        this.towerAOI.addObject({ "id": one.id, "type": one.type }, { "x": one.x, "y": one.y });
        this.towerAOI.addWatcher({ "id": one.id, "type": one.type }, { "x": one.x, "y": one.y }, one.range);
        return {
            "width": this.width,
            "height": this.height,
            "towerWidth": this.towerWidth,
            "towerHeight": this.towerHeight,
            "tileWidth": this.tileWidth,
            "entities": entities,
            "obstacles": this.obstacles,
            "mePlayer": one.toJSON()
        };
    };
    /**
     * 玩家
     * @param msg
     * @param uid
     * @param id
     * @param next
     */
    map.prototype.move = function (msg, id) {
        var one = this.entities[id];
        if (!one) {
            return;
        }
        var startX = this.changePos(one.x);
        var startY = this.changePos(one.y);
        var endX = this.changePos(msg.x1);
        var endY = this.changePos(msg.y1);
        var path = this.pathFind.findPath(startX, startY, endX, endY);
        if (path === null) {
            return;
        }
        var endTile = path[path.length - 1];
        if (path.length === 0) { // 周围被堵住，或者是当前格子
            if (startX !== endX || startY !== endY) {
                return;
            }
        }
        else if (endTile.x !== endX || endTile.y !== endY) {
            path.pop();
            msg.x1 = endTile.x * this.tileWidth + this.tileWidth / 2;
            msg.y1 = endTile.y * this.tileWidth + this.tileWidth / 2;
        }
        else {
            path.pop();
        }
        this.tileToPos(path);
        path.push({ "x": msg.x1, "y": msg.y1 });
        one.path = path;
        var uids = this.getWatcherUids(one.x, one.y);
        this.pushMsg("onMove", { "uid": one.uid, "x": one.x, "y": one.y, "path": one.path }, uids);
    };
    map.prototype.pickItem = function (itemId, id) {
        var one = this.entities[id];
        if (!one) {
            return;
        }
        var itemPick = this.entities[itemId];
        if (!itemPick) {
            return;
        }
        if (util_1.getDistance(one, itemPick) > 1) {
            return;
        }
        this.towerAOI.removeObject({ "id": itemId, "type": entity_1.entity_type.item }, itemPick);
        delete this.entities[itemId];
        var uids = this.getWatcherUids(one.x, one.y);
        var entities = {};
        entities[entity_1.entity_type.item] = [Number(itemId)];
        this.onRemoveEntitiesFunc(uids, entities);
    };
    map.prototype.tileToPos = function (path) {
        var one;
        for (var i = 0; i < path.length; i++) {
            one = path[i];
            one.x = one.x * this.tileWidth + this.tileWidth / 2;
            one.y = one.y * this.tileWidth + this.tileWidth / 2;
        }
        return path;
    };
    map.prototype.getWatcherUids = function (x, y) {
        var ids = this.towerAOI.getWatchersByTypes({ "x": x, "y": y }, [entity_1.entity_type.player])[entity_1.entity_type.player];
        if (!ids) {
            return [];
        }
        var res = [];
        for (var id in ids) {
            res.push(this.entities[id].uid);
        }
        return res;
    };
    map.prototype.changePos = function (x) {
        return Math.floor(x / this.tileWidth);
    };
    /**
     * 玩家离开
     * @param id
     */
    map.prototype.leave = function (id) {
        var one = this.entities[id];
        if (!one) {
            return;
        }
        this.towerAOI.removeWatcher({ "id": id, "type": entity_1.entity_type.player }, { "x": one.x, "y": one.y }, 3);
        this.towerAOI.removeObject({ "id": id, "type": one.type }, { "x": one.x, "y": one.y });
        delete this.entities[id];
        console.log("leave: ", id);
    };
    /**
     * 根据id数组获取实体JSON
     * @param ids
     */
    map.prototype.getEntitiesJSON = function (ids) {
        var res = {};
        var length = 0;
        for (var i = 0; i < ids.length; i++) {
            var entity_2 = this.entities[ids[i]];
            if (!entity_2) {
                continue;
            }
            if (!res[entity_2.type]) {
                res[entity_2.type] = [];
            }
            res[entity_2.type].push(entity_2.toJSON());
            length++;
        }
        return { "length": length, "entities": res };
    };
    /**
     * 获取实体
     * @param id
     */
    map.prototype.getEntity = function (id) {
        return this.entities[id];
    };
    map.prototype.pushMsg = function (cmd, msg, uids) {
        this.app.sendMsgByUid(cmd, msg, uids);
    };
    map.prototype.onAddEntitiesFunc = function (uids, entities) {
        this.pushMsg("onAddEntities", entities, uids);
    };
    map.prototype.onRemoveEntitiesFunc = function (uids, entities) {
        this.pushMsg("onRemoveEntities", entities, uids);
    };
    return map;
}());
exports.map = map;
