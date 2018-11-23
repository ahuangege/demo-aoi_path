"use strict";
var __extends = (this && this.__extends) || (function () {
    var extendStatics = Object.setPrototypeOf ||
        ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
        function (d, b) { for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p]; };
    return function (d, b) {
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
var entity_1 = require("./entity");
var item = /** @class */ (function (_super) {
    __extends(item, _super);
    function item(opts) {
        return _super.call(this, { "type": entity_1.entity_type.item, "x": opts.x, "y": opts.y }) || this;
    }
    item.prototype.toJSON = function () {
        return {
            id: this.id,
            type: this.type,
            x: Number(this.x.toFixed(2)),
            y: Number(this.y.toFixed(2))
        };
    };
    item.prototype.update = function () {
    };
    return item;
}(entity_1.entity));
exports.item = item;
