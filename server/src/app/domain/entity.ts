export enum entity_type {
    player = 1,
    item = 2,
}

let id = 0;
export class entity {
    id: number = 0;
    type: entity_type;
    x: number;
    y: number;
    tx = 0; // 在aoi中的实体坐标x
    ty = 0; // 在aoi中的实体坐标y
    wx = 0; // 在aoi中的观察者坐标x
    wy = 0; // 在aoi中的观察者坐标y
    constructor(opts: { type: entity_type, x: number, y: number }) {
        this.id = ++id;
        this.type = opts.type;
        this.x = opts.x;
        this.y = opts.y;
    }
    toJSON() {

    }

    update() {

    }
}