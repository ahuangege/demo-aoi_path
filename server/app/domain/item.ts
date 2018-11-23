import { entity, entity_type } from "./entity";

export class item extends entity {
    constructor(opts: { x: number, y: number }) {
        super({ "type": entity_type.item, "x": opts.x, "y": opts.y })
    }

    toJSON() {
        return {
            id: this.id,
            type: this.type,
            x: Number(this.x.toFixed(2)),
            y: Number(this.y.toFixed(2))
        }
    }

    update(){
        
    }
}