import { entity, entity_type } from "./entity";
import { getDistance, getLerpPos, vector2 } from "./util";
import { map, I_newPlayerJson } from "./map";

export class player extends entity {
    username: string;
    uid: number;
    path: { "x": number, "y": number }[] = [];
    speed: number = 2;
    updateTime: number = Date.now();
    map: map;
    range: number = 0;
    private needMove: boolean = true;
    constructor(opts: { uid: number, username: string, x: number, y: number, map: map, range: number, speed: number }) {
        super({ "type": entity_type.player, "x": opts.x, "y": opts.y });
        this.uid = opts.uid;
        this.username = opts.username;
        this.map = opts.map;
        this.range = opts.range;
        this.speed = opts.speed;
    }

    update() {
        this.needMove = !this.needMove;
        if (!this.needMove) {
            return;
        }
        let time = (Date.now() - this.updateTime) / 1000;
        this.updateTime = Date.now();

        if (this.path.length > 0) {
            let moveDis = this.speed * time;
            let oldPos = { "x": this.x, "y": this.y };

            let startPos: vector2 = oldPos;
            let endPos: vector2 = null as any;
            let i: number = 0;
            for (i = 0; i < this.path.length; i++) {
                let tmp_dis = getDistance(startPos, this.path[i]);
                if (moveDis > tmp_dis) {
                    moveDis = moveDis - tmp_dis;
                    startPos = this.path[i];
                    endPos = startPos;
                } else {
                    endPos = getLerpPos(startPos, this.path[i], moveDis, tmp_dis);
                    break;
                }
            }
            this.path.splice(0, i);
            this.x = endPos.x;
            this.y = endPos.y;

            let obj = { "id": this.id, "type": entity_type.player };
            this.map.towerAOI.updateWatcher(obj, oldPos, endPos, this.range, this.range);
            this.map.towerAOI.updateObj(obj, oldPos, endPos);
        }
    }

    toJSON(): I_newPlayerJson {
        return {
            id: this.id,
            type: this.type,
            x: Number(this.x.toFixed(2)),
            y: Number(this.y.toFixed(2)),
            username: this.username,
            uid: this.uid,
            path: this.path,
            speed: this.speed
        }
    }


}