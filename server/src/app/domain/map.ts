import { Application } from "mydog";
import { player } from "./player";
import { item } from "./item";
import { entity, entity_type } from "./entity";
import { TowerAOI } from "tower-aoi";
import { addEvent } from "./aoiEventManager";
import pathFind from "a-star-pathfind"
import { getDistance, vector2 } from "./util";

enum tower_range {
    player = 2,
}

export class map {
    private app: Application;
    public towerAOI: TowerAOI;
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
        this.towerAOI = new TowerAOI({ width: this.width, height: this.height, towerWidth: this.towerWidth, towerHeight: this.towerHeight });


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
                    this.towerAOI.addObject({ "id": tmp.id, "type": entity_type.item }, { "x": posX, "y": posy });
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
        let ids = this.towerAOI.getIdsByPos({ "x": one.x, "y": one.y }, one.range);
        let entities = this.getEntitiesJSON(ids).entities;
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
    }

    /**
     * 玩家
     * @param msg 
     * @param uid 
     * @param id 
     * @param next 
     */
    public move(msg: any, id: number) {
        let one = this.entities[id] as player;
        if (!one) {
            return;
        }
        let startX = this.changePos(one.x);
        let startY = this.changePos(one.y);
        let endX = this.changePos(msg.x1);
        let endY = this.changePos(msg.y1);
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
            msg.x1 = endTile.x * this.tileWidth + this.tileWidth / 2;
            msg.y1 = endTile.y * this.tileWidth + this.tileWidth / 2;
        } else {
            path.pop();
        }
        this.tileToPos(path);
        path.push({ "x": msg.x1, "y": msg.y1 });
        one.path = path;

        let uids = this.getWatcherUids(one.x, one.y);
        this.pushMsg("onMove", { "uid": one.uid, "x": one.x, "y": one.y, "path": one.path }, uids);
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
        this.towerAOI.removeObject({ "id": itemId, "type": entity_type.item }, itemPick);
        delete this.entities[itemId];
        let uids = this.getWatcherUids(one.x, one.y);
        let entities: { [type: string]: number[] } = {};
        entities[entity_type.item] = [Number(itemId)];
        this.onRemoveEntitiesFunc(uids, entities);
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

    private getWatcherUids(x: number, y: number) {
        let ids = this.towerAOI.getWatchersByTypes({ "x": x, "y": y }, [entity_type.player])[entity_type.player];
        if (!ids) {
            return [];
        }
        let res: number[] = [];
        for (let id in ids) {
            res.push((this.entities[id] as player).uid);
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
        let one = this.entities[id];
        if (!one) {
            return;
        }
        this.towerAOI.removeWatcher({ "id": id, "type": entity_type.player }, { "x": one.x, "y": one.y }, 3);
        this.towerAOI.removeObject({ "id": id, "type": one.type }, { "x": one.x, "y": one.y });
        delete this.entities[id];
        console.log("leave: ", id)
    }

    /**
     * 根据id数组获取实体JSON
     * @param ids 
     */
    public getEntitiesJSON(ids: number[]) {
        let res: { [type: string]: any[] } = {};
        let length: number = 0;
        for (let i = 0; i < ids.length; i++) {
            let entity = this.entities[ids[i]];
            if (!entity) {
                continue;
            }
            if (!res[entity.type]) {
                res[entity.type] = [];
            }
            res[entity.type].push(entity.toJSON());
            length++;
        }
        return { "length": length, "entities": res };
    }

    /**
     * 获取实体
     * @param id 
     */
    public getEntity(id: number | string) {
        return this.entities[id];
    }

    public pushMsg(cmd: string, msg: any, uids: number[]) {
        this.app.sendMsgByUid(cmd, msg, uids);
    }

    public onAddEntitiesFunc(uids: number[], entities: { [type: string]: any[] }) {
        this.pushMsg("onAddEntities", entities, uids);
    }

    public onRemoveEntitiesFunc(uids: number[], entities: { [type: string]: any[] }) {
        this.pushMsg("onRemoveEntities", entities, uids);
    }
}