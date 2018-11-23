import { Application, Session } from "mydog";
import { map_instance } from "../../../../app";

export default class handler {
    app: Application;
    constructor(_app: Application) {
        this.app = _app;
    }

    /**
     * 进入游戏
     * @param msg 
     * @param session 
     * @param next 
     */
    enter(msg: any, session: Session, next: Function) {
        if (!msg.username) {
            return;
        }
        let res = map_instance.enter(msg.username);
        session.bind(res.mePlayer.uid);
        session.set("id", res.mePlayer.id);
        session.setCloseCb(closed_cb);
        next(res);
    }

    /**
     * 切换移动路线
     * @param msg 
     * @param session 
     * @param next 
     */
    move(msg: any, session: Session, next: Function) {
        map_instance.move(msg, session.get("id"));
    }

    /**
     * 拾取物品
     * @param msg 
     * @param session 
     * @param next 
     */
    pickItem(msg: any, session: Session, next: Function) {
        map_instance.pickItem(msg.id, session.get("id"));
    }


}

function closed_cb(app: Application, session: Session) {
    console.log("断开连接: ", session.uid);
    if (!session.uid) {
        return;
    }
    map_instance.leave(session.get("id"));
}