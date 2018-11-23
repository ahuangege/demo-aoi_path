"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * 计算两个坐标之间的距离
 * @param pos1 坐标1
 * @param pos2 坐标2
 */
function getDistance(pos1, pos2) {
    return Math.sqrt((pos1.x - pos2.x) * (pos1.x - pos2.x) + (pos1.y - pos2.y) * (pos1.y - pos2.y));
}
exports.getDistance = getDistance;
/**
 * 沿向量移动后的坐标
 * @param start 起始坐标
 * @param end 终点坐标
 * @param moveDis 移动的距离
 * @param length 总长度
 */
function getLerpPos(start, end, moveDis, length) {
    if (!length) {
        length = getDistance(start, end);
    }
    var pos = {};
    pos.x = start.x + (end.x - start.x) * (moveDis / length);
    pos.y = start.y + (end.y - start.y) * (moveDis / length);
    return pos;
}
exports.getLerpPos = getLerpPos;
