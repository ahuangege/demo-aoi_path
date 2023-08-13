export interface vector2 {
    x: number,
    y: number
}

/**
 * 计算两个坐标之间的距离
 * @param pos1 坐标1
 * @param pos2 坐标2
 */
export function getDistance(pos1: { "x": number, "y": number }, pos2: { "x": number, "y": number }) {
    return Math.sqrt((pos1.x - pos2.x) * (pos1.x - pos2.x) + (pos1.y - pos2.y) * (pos1.y - pos2.y));
}

/**
 * 沿向量移动后的坐标
 * @param start 起始坐标
 * @param end 终点坐标
 * @param moveDis 移动的距离
 * @param length 总长度
 */
export function getLerpPos(start: { "x": number, "y": number }, end: { "x": number, "y": number }, moveDis: number, length?: number) {
    if (!length) {
        length = getDistance(start, end);
    }
    var pos = {} as { "x": number, "y": number };

    pos.x = start.x + (end.x - start.x) * (moveDis / length);
    pos.y = start.y + (end.y - start.y) * (moveDis / length);

    return pos;
}