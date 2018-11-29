import { map } from "./map";
import { TowerAOI } from "tower-aoi";
import { entity_type } from "./entity";
import { player } from "./player";


interface add_remove_interface {
    id: number,
    type: string,
    watchers: { [type: string]: { [id: number]: number } }
}

interface update_interface {
    id: number,
    type: string,
    oldWatchers: { [type: string]: { [id: number]: number } },
    newWatchers: { [type: string]: { [id: number]: number } }
}

interface updateWatcher_interface {
    id: number,
    type: string,
    addObjs: number[],
    removeObjs: number[]
}

/**
 * 灯塔事件管理
 * @param map 
 * @param aoi 
 */
export function addEvent(map: map, aoi: TowerAOI) {

    // 增加实体
    aoi.on("add", function (params: add_remove_interface) {
        if (params.type === entity_type.player) {
            onPlayerAdd(map, params);
        }
    });

    //  移除实体
    aoi.on("remove", function (params: add_remove_interface) {
        if (params.type === entity_type.player) {
            onPlayerRemove(map, params);
        }
    });

    // 实体位置更新，通知对应观察者
    aoi.on('update', function (params: update_interface) {
        if (params.type === entity_type.player) {
            onPosUpdate(map, params);
        }
    });

    // 实体观察区域更新，通知实体
    aoi.on('updateWatcher', function (params: updateWatcher_interface) {
        if (params.type === entity_type.player) {
            onWatcherUpdate(map, params);
        }
    });
}



function onPlayerAdd(map: map, params: add_remove_interface) {
    console.log("player add-- ", params);

    let entityId = params.id;
    let watchers = params.watchers;
    let player = map.getEntity(entityId) as player;
    if (!player) {
        // return;
    }

    for (let type in watchers) {
        if (type === entity_type.player) {
            let uids: number[] = [];
            for (let id in watchers[type]) {
                let watcher = map.getEntity(id) as player;
                if (watcher.id !== entityId) {
                    uids.push(watcher.uid);
                }
            }
            if (uids.length > 0) {
                let entities: { [type: string]: any[] } = {};
                entities[entity_type.player] = [player.toJSON()];
                map.onAddEntitiesFunc(uids, entities);
            }
        }
    }
}

function onPlayerRemove(map: map, params: add_remove_interface) {
    console.log("player remove-- ", params);

    let entityId = params.id;
    let watchers = params.watchers;
    let player = map.getEntity(entityId) as player;
    if (!player) {
        // return;
    }

    for (let type in watchers) {
        if (type === entity_type.player) {
            let uids: number[] = [];
            for (let id in watchers[type]) {
                let watcher = map.getEntity(id) as player;
                if (watcher.id !== entityId) {
                    uids.push(watcher.uid);
                }
            }
            if (uids.length > 0) {
                let entities: { [type: string]: number[] } = {};
                entities[entity_type.player] = [player.uid];
                map.onRemoveEntitiesFunc(uids, entities);
            }
        }
    }
}

function onPosUpdate(map: map, params: update_interface) {
    console.log("onPosUpdate-- ", params);

    let entity = map.getEntity(params.id);
    if (!entity) {
        // return;
    }

    let oldWatchers = params.oldWatchers;
    let newWatchers = params.newWatchers;
    let removeWatchers: { [type: string]: { [id: number]: number } } = {};
    let addWatchers: { [type: string]: { [id: number]: number } } = {};
    let type: string, w1, w2, id;
    for (type in oldWatchers) {
        if (!newWatchers[type]) {
            removeWatchers[type] = oldWatchers[type];
            continue;
        }
        w1 = oldWatchers[type];
        w2 = newWatchers[type];
        removeWatchers[type] = {};
        for (id in w1) {
            if (!w2[id]) {
                removeWatchers[type][id] = w1[id];
            }
        }
    }

    for (type in newWatchers) {
        if (!oldWatchers[type]) {
            addWatchers[type] = newWatchers[type];
            continue;
        }

        w1 = oldWatchers[type];
        w2 = newWatchers[type];
        addWatchers[type] = {};
        for (id in w2) {
            if (!w1[id]) {
                addWatchers[type][id] = w2[id];
            }
        }
    }

    if (params.type === entity_type.player) {
        onPlayerAdd(map, { "id": params.id, "type": params.type, "watchers": addWatchers });
        onPlayerRemove(map, { "id": params.id, "type": params.type, "watchers": removeWatchers });
    }
}



function onWatcherUpdate(map: map, params: updateWatcher_interface) {
    console.log("updateWatcher-- ", params);

    let player = map.getEntity(params.id) as player;
    if (!player) {
        // return;
    }

    if (params.addObjs.length > 0) {
        let entities = map.getEntitiesJSON(params.addObjs);
        if (entities.length > 0) {
            map.onAddEntitiesFunc([player.uid], entities.entities);
        }
    }
    if (params.removeObjs.length > 0) {
        let entities: { [type: string]: number[] } = {};
        let has = false;
        for (let i = 0; i < params.removeObjs.length; i++) {
            let entity = map.getEntity(params.removeObjs[i]);
            if (!entity) {
                continue;
            }
            if (!entities[entity.type]) {
                entities[entity.type] = [];
            }
            if (entity.type === entity_type.player) {
                entities[entity.type].push((entity as player).uid);
            } else {
                entities[entity.type].push(entity.id);
            }
            has = true;
        }
        if (has) {
            map.onRemoveEntitiesFunc([player.uid], entities);
        }
    }
}

