import { Application } from "mydog";
import { player } from "./player";
import { item } from "./item";
import { entity, entity_type } from "./entity";
import { TowerAOI } from "tower-aoi";
import { addEvent } from "./aoiEventManager";
import pathFind from "a-star-pathfind"
import { getDistance, vector2 } from "./util";
import { cmd } from "../../config/cmd";

enum tower_range {
    player = 2,
}

export interface I_newEntities {
    "players": I_newPlayerJson[],
    "items": I_newItemJson[]
}

export interface I_newPlayerJson {
    "id": number,
    "type": number,
    "x": number,
    "y": number,
    "username": string,
    "uid": number,
    "path": { "x": number, "y": number }[],
    "speed": number,
}

export interface I_newItemJson {
    "id": number,
    "type": number,
    "x": number,
    "y": number,
}

export interface I_removeEntities {
    "players": number[],
    "items": number[],
}

export class map {
    private app: Application;
    public towerAOI: TowerAOI<entity, entity>;
    private pathFind: pathFind;

    private width: number = 150;
    private height: number = 80;
    private towerWidth: number = 10;
    private towerHeight: number = 5;
    private tileWidth: number = 1;

    private uid_now = 0;
    private entities: { [id: string]: entity } = {};
    private obstacles: vector2[] = [];

    constructor(app: Application) {
        this.app = app;
        this.towerAOI = new TowerAOI<entity, entity>({ width: this.width, height: this.height, towerWidth: this.towerWidth, towerHeight: this.towerHeight, bufferNum: 2 });


        let arr: number[][] = [];
        for (let i = 0; i < Math.ceil(this.height / this.tileWidth); i++) {
            arr[i] = [];
            for (let j = 0; j < Math.ceil(this.width / this.tileWidth); j++) {
                if (Math.random() < 0.005) {
                    arr[i][j] = 0;
                    this.obstacles.push({ "x": j, "y": i });
                } else {
                    arr[i][j] = 1;
                }
            }
        }

        this.pathFind = new pathFind();
        this.pathFind.init(arr);

        addEvent(this, this.towerAOI);
        setInterval(this.update.bind(this), 100);
        this.initItems();
    }

    initItems() {
        for (let i = 0; i < Math.ceil(this.height / this.towerHeight); i++) {
            for (let j = 0; j < Math.ceil(this.width / this.towerWidth); j++) {
                let randNum = Math.floor(Math.random() * 5);
                for (let k = 0; k < randNum; k++) {
                    let posX = j * this.towerWidth + Math.random() * this.towerWidth;
                    let posy = i * this.towerHeight + Math.random() * this.towerHeight;
                    let tmp = new item({ "x": posX, "y": posy });
                    this.entities[tmp.id] = tmp;
                    this.towerAOI.addObj(tmp, { "x": posX, "y": posy });
                }
            }
        }
    }


    update() {
        for (let id in this.entities) {
            this.entities[id].update();
        }
    }

    /**
     * 玩家进入场景
     * @param username 
     */
    public enter(username: string) {
        let uid = ++this.uid_now;
        let one = new player({
            "uid": uid,
            "username": username,
            "x": Math.random() * this.width,
            "y": Math.random() * this.height,
            "map": this,
            "speed": 4,
            "range": tower_range.player
        });
        this.entities[one.id] = one;
        let objs = this.towerAOI.getObjsByPos({ "x": one.x, "y": one.y }, one.range);
        let entities = this.getEntitiesJSON(objs);
        this.towerAOI.addObj(one, { "x": one.x, "y": one.y });
        this.towerAOI.addWatcher(one, { "x": one.x, "y": one.y }, one.range);

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
    }

    /**
     * 玩家
     * @param msg 
     * @param uid 
     * @param id 
     * @param next 
     */
    public move(msg: { "x": number, "y": number }, id: number) {
        let one = this.entities[id] as player;
        if (!one) {
            return;
        }
        let startX = this.changePos(one.x);
        let startY = this.changePos(one.y);
        let endX = this.changePos(msg.x);
        let endY = this.changePos(msg.y);
        let path = this.pathFind.findPath(startX, startY, endX, endY);
        if (path === null) {
            return;
        }
        let endTile = path[path.length - 1];
        if (path.length === 0) {  // 周围被堵住，或者是当前格子
            if (startX !== endX || startY !== endY) {
                return;
            }
        } else if (endTile.x !== endX || endTile.y !== endY) {
            path.pop();
            msg.x = endTile.x * this.tileWidth + this.tileWidth / 2;
            msg.y = endTile.y * this.tileWidth + this.tileWidth / 2;
        } else {
            path.pop();
        }
        this.tileToPos(path);
        path.push({ "x": msg.x, "y": msg.y });
        one.path = path;

        let uids = this.getWatcherUids(one);
        this.app.sendMsgByUid(cmd.onMove, { "id": one.id, "x": one.x, "y": one.y, "path": one.path }, uids);
    }

    public pickItem(itemId: number, id: number) {
        let one = this.entities[id] as player;
        if (!one) {
            return;
        }
        let itemPick = this.entities[itemId] as item;
        if (!itemPick) {
            return;
        }
        if (getDistance(one, itemPick) > 1) {
            return;
        }
        this.towerAOI.removeObj(one);
        delete this.entities[itemId];
        let uids = this.getWatcherUids(one);
        this.msgRemoveEntities(uids, { "players": [], "items": [itemId] });
    }

    private tileToPos(path: { x: number, y: number }[]) {
        let one;
        for (let i = 0; i < path.length; i++) {
            one = path[i];
            one.x = one.x * this.tileWidth + this.tileWidth / 2;
            one.y = one.y * this.tileWidth + this.tileWidth / 2;
        }
        return path;
    }

    private getWatcherUids(entity: entity) {
        let watchers = this.towerAOI.getWatchers(entity);
        let res: number[] = [];
        for (let one of watchers) {
            if (one.type === entity_type.player) {
                res.push((this.entities[one.id] as player).uid);
            }
        }
        return res;
    }

    private changePos(x: number) {
        return Math.floor(x / this.tileWidth);
    }

    /**
     * 玩家离开
     * @param id 
     */
    public leave(id: number) {
        let one = this.entities[id] as player;
        if (!one) {
            return;
        }
        this.towerAOI.removeWatcher(one, one.range);
        this.towerAOI.removeObj(one);
        delete this.entities[id];
        // console.log("leave: ", id)
    }

    /**
     * 根据id数组获取实体JSON
     */
    public getEntitiesJSON(entitys: entity[]): I_newEntities {
        let res: I_newEntities = { "players": [], "items": [] };
        for (let one of entitys) {
            let entity = this.entities[one.id];
            if (!entity) {
                continue;
            }
            if (one.type === entity_type.player) {
                res.players.push((entity as player).toJSON());
            } else if (one.type === entity_type.item) {
                res.items.push((entity as item).toJSON());
            }
        }
        return res;
    }

    /**
     * 获取实体
     * @param id 
     */
    public getEntity(id: number | string) {
        return this.entities[id];
    }



    public msgAddEntities(uids: number[], entities: I_newEntities) {
        this.app.sendMsgByUid(cmd.onAddEntities, entities, uids);
    }

    public msgRemoveEntities(uids: number[], entities: I_removeEntities) {
        this.app.sendMsgByUid(cmd.onRemoveEntities, entities, uids);
    }
}