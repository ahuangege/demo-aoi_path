"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var entity_1 = require("./entity");
/**
 * 灯塔事件管理
 * @param map
 * @param aoi
 */
function addEvent(map, aoi) {
    // 增加实体
    aoi.on("add", function (params) {
        if (params.type === entity_1.entity_type.player) {
            onPlayerAdd(map, params);
        }
    });
    //  移除实体
    aoi.on("remove", function (params) {
        if (params.type === entity_1.entity_type.player) {
            onPlayerRemove(map, params);
        }
    });
    // 实体位置更新，通知对应观察者
    aoi.on('update', function (params) {
        if (params.type === entity_1.entity_type.player) {
            onPosUpdate(map, params);
        }
    });
    // 实体观察区域更新，通知实体
    aoi.on('updateWatcher', function (params) {
        if (params.type === entity_1.entity_type.player) {
            onWatcherUpdate(map, params);
        }
    });
}
exports.addEvent = addEvent;
function onPlayerAdd(map, params) {
    console.log("player add-- ", params);
    var entityId = params.id;
    var watchers = params.watchers;
    var player = map.getEntity(entityId);
    if (!player) {
        // return;
    }
    for (var type in watchers) {
        if (type === entity_1.entity_type.player) {
            var uids = [];
            for (var id in watchers[type]) {
                var watcher = map.getEntity(id);
                if (watcher.id !== entityId) {
                    uids.push(watcher.uid);
                }
            }
            if (uids.length > 0) {
                var entities = {};
                entities[entity_1.entity_type.player] = [player.toJSON()];
                map.onAddEntitiesFunc(uids, entities);
            }
        }
    }
}
function onPlayerRemove(map, params) {
    console.log("player remove-- ", params);
    var entityId = params.id;
    var watchers = params.watchers;
    var player = map.getEntity(entityId);
    if (!player) {
        // return;
    }
    for (var type in watchers) {
        if (type === entity_1.entity_type.player) {
            var uids = [];
            for (var id in watchers[type]) {
                var watcher = map.getEntity(id);
                if (watcher.id !== entityId) {
                    uids.push(watcher.uid);
                }
            }
            if (uids.length > 0) {
                var entities = {};
                entities[entity_1.entity_type.player] = [player.uid];
                map.onRemoveEntitiesFunc(uids, entities);
            }
        }
    }
}
function onPosUpdate(map, params) {
    console.log("onPosUpdate-- ", params);
    var entity = map.getEntity(params.id);
    if (!entity) {
        // return;
    }
    var oldWatchers = params.oldWatchers;
    var newWatchers = params.newWatchers;
    var removeWatchers = {};
    var addWatchers = {};
    var type, w1, w2, id;
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
    if (params.type === entity_1.entity_type.player) {
        onPlayerAdd(map, { "id": params.id, "type": params.type, "watchers": addWatchers });
        onPlayerRemove(map, { "id": params.id, "type": params.type, "watchers": removeWatchers });
    }
}
function onWatcherUpdate(map, params) {
    console.log("updateWatcher-- ", params);
    var player = map.getEntity(params.id);
    if (!player) {
        // return;
    }
    if (params.addObjs.length > 0) {
        var entities = map.getEntitiesJSON(params.addObjs);
        if (entities.length > 0) {
            map.onAddEntitiesFunc([player.uid], entities.entities);
        }
    }
    if (params.removeObjs.length > 0) {
        var entities = {};
        var has = false;
        for (var i = 0; i < params.removeObjs.length; i++) {
            var entity = map.getEntity(params.removeObjs[i]);
            if (!entity) {
                continue;
            }
            if (!entities[entity.type]) {
                entities[entity.type] = [];
            }
            if (entity.type === entity_1.entity_type.player) {
                entities[entity.type].push(entity.uid);
            }
            else {
                entities[entity.type].push(entity.id);
            }
            has = true;
        }
        if (has) {
            map.onRemoveEntitiesFunc([player.uid], entities);
        }
    }
}
