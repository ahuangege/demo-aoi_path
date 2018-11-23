"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var entity_type;
(function (entity_type) {
    entity_type["player"] = "player";
    entity_type["item"] = "item";
})(entity_type = exports.entity_type || (exports.entity_type = {}));
var id = 0;
var entity = /** @class */ (function () {
    function entity(opts) {
        this.id = 0;
        this.id = ++id;
        this.type = opts.type;
        this.x = opts.x;
        this.y = opts.y;
    }
    entity.prototype.toJSON = function () {
    };
    entity.prototype.update = function () {
    };
    return entity;
}());
exports.entity = entity;
