export enum entity_type {
    player = "player",
    item = "item",
}

let id = 0;
export class entity {
    id: number = 0;
    type: entity_type;
    x: number;
    y: number;
    constructor(opts: { type: entity_type, x: number, y: number }) {
        this.id = ++id;
        this.type = opts.type;
        this.x = opts.x;
        this.y = opts.y;
    }
    toJSON(){

    }

    update(){
        
    }
}