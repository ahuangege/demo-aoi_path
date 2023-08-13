import { map, I_removeEntities } from "./map";
import { TowerAOI } from "tower-aoi";
import { entity, entity_type } from "./entity";
import { player } from "./player";


/**
 * 灯塔事件管理
 * @param map 
 * @param aoi 
 */
export function addEvent(map: map, aoi: TowerAOI<entity, entity>) {

    // 增加实体，通知对应观察者
    aoi.on("addObj", function (obj: entity, watchers: entity[]) {
        if (obj.type === entity_type.player) {
            onPlayerAdd(map, obj, watchers);
        }
    });

    //  移除实体，通知对应观察者
    aoi.on("removeObj", function (obj: entity, watchers: entity[]) {
        if (obj.type === entity_type.player) {
            onPlayerRemove(map, obj, watchers);
        }
    });

    // 实体位置更新，通知对应观察者
    aoi.on("updateObj", function (obj: entity, addWatchers: entity[], removeWatchers: entity[]) {
        if (obj.type === entity_type.player) {
            onPlayerAdd(map, obj, addWatchers);
            onPlayerRemove(map, obj, removeWatchers);
        }
    });

    // 该实体观察区域更新，通知该实体
    aoi.on('updateWatcher', function (obj: entity, addObjs: entity[], removeObjs: entity[]) {
        if (obj.type === entity_type.player) {
            onWatcherUpdate(map, obj, addObjs, removeObjs);
        }
    });
}



function onPlayerAdd(map: map, obj: entity, watchers: entity[]) {
    let uids: number[] = [];
    for (let one of watchers) {
        if (one.type === entity_type.player) {
            uids.push((one as player).uid);
        }
    }
    if (uids.length > 0) {
        let player = map.getEntity(obj.id) as player;
        map.msgAddEntities(uids, { "items": [], "players": [player.toJSON()] });
    }
}

function onPlayerRemove(map: map, obj: entity, watchers: entity[]) {
    let uids: number[] = [];
    for (let one of watchers) {
        if (one.type === entity_type.player) {
            let tmpPlayer = map.getEntity(one.id) as player;
            uids.push(tmpPlayer.uid);
        }
    }
    if (uids.length > 0) {
        map.msgRemoveEntities(uids, { "items": [], "players": [obj.id] });
    }
}

function onWatcherUpdate(map: map, obj: entity, addObjs: entity[], removeObjs: entity[]) {
    let player = map.getEntity(obj.id) as player;
    if (addObjs.length > 0) {
        let entities = map.getEntitiesJSON(addObjs);
        map.msgAddEntities([player.uid], entities);
    }
    if (removeObjs.length > 0) {
        let removes: I_removeEntities = { "players": [], "items": [] };
        for (let one of removeObjs) {
            if (one.type === entity_type.player) {
                removes.players.push(one.id);
            } else if (one.type === entity_type.item) {
                removes.items.push(one.id);
            }
        }
        map.msgRemoveEntities([player.uid], removes);
    }
}

