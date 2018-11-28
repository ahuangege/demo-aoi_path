import * as net from "net";
const MAX_lEN = 10 * 1024 * 1024;



export class client {
    private net_instance: net_socket = null as any;
    private route: string[] = [];
    private handlers: { [id: number]: Function } = {};
    private msgCache: { "id": number, "data": any }[] = [];

    connect(host: string, port: number) {
        this.disconnect();
        this.net_instance = new net_socket(host, port, this.msgCache, this.route);
    }

    onOpen(cb: Function, self: object) {
        this.handlers[socket_cb_code.open] = cb.bind(self);
    }

    offOpen() {
        delete this.handlers[socket_cb_code.open];
    }

    onClose(cb: Function, self: object) {
        this.handlers[socket_cb_code.close] = cb.bind(self);
    }

    offClose() {
        delete this.handlers[socket_cb_code.close];
    }

    addHandler(cmd: string, cb: Function, self: object) {
        let cmdIndex = this.route.indexOf(cmd);
        if (cmdIndex === -1) {
            console.log("addHandler: cmd not exists -- " + cmd);
            return;
        }
        this.handlers[cmdIndex] = cb.bind(self);
    }

    removeHandler(cmd: string) {
        let cmdIndex = this.route.indexOf(cmd);
        if (cmdIndex === -1) {
            console.log("removeHandler: cmd not exists -- " + cmd);
            return;
        }
        delete this.handlers[cmdIndex];
    }

    sendMsg(cmd: string, data: any) {
        let cmdIndex = this.route.indexOf(cmd);
        if (cmdIndex === -1) {
            console.log("sendMsg: cmd not exists -- " + cmd);
            return;
        }
        if (this.net_instance) {
            this.net_instance.send(cmdIndex, data);
        }
    }

    readMsg() {
        if (this.msgCache.length > 0) {
            let tmp = this.msgCache.shift() as { "id": number, "data": any };
            if (this.handlers[tmp.id]) {
                this.handlers[tmp.id](tmp.data);
            }
        }
    }

    disconnect() {
        this.msgCache = [];
        this.route = [];
        if (this.net_instance) {
            this.net_instance.close();
            this.net_instance = null as any;
        }
    }
}


const enum socket_cb_code {
    /**
     * 连接成功
     */
    open = -1,
    /**
     * 关闭
     */
    close = -2,
}

class net_socket {
    private netSocket: net.Socket = null as any;

    private msgCache: { "id": number, "data": any }[] = [];
    private route: string[] = [];

    private heartbeatTimer: NodeJS.Timer = null as any;
    private tmpBuf = { "len": 0, "buffer": Buffer.alloc(0) };
    private die: boolean = false;

    constructor(host: string, port: number, msgCache: { "id": number, "data": any }[], route: string[]) {
        this.msgCache = msgCache;
        this.route = route;
        this.netSocket = net.connect(port, host, this.connect_cb.bind(this));
        let tmpCb = this.close_cb.bind(this);
        this.netSocket.on("close", tmpCb);
        this.netSocket.on("error", tmpCb);
        this.netSocket.on("data", this.on_data.bind(this));
    }

    /**
     * 连接成功的回调，发送握手协议
     */
    private connect_cb() {
        if (this.die) {
            return;
        }
        // 握手
        let buffer = Buffer.alloc(5);
        buffer[0] = (1 >> 24) & 0xff;
        buffer[1] = (1 >> 16) & 0xff;
        buffer[2] = (1 >> 8) & 0xff;
        buffer[3] = 1 & 0xff;
        buffer[4] = 1 & 0xff;
        this.netSocket.write(buffer);
    }

    /**
     * 连接关闭的回调
     */
    private close_cb(err: any) {
        if (this.die) {
            return;
        }
        this.die = true;
        clearInterval(this.heartbeatTimer);
        this.msgCache.push({ "id": socket_cb_code.close, "data": null })
    }

    /**
     * 接收到数据
     * @param data 
     */
    private on_data(msg: Buffer) {
        let tmpBuf = this.tmpBuf;
        let readLen = 0;
        while (readLen < msg.length) {
            if (tmpBuf.len === 0) //data length is unknown
            {
                tmpBuf.buffer = Buffer.concat([tmpBuf.buffer, Buffer.from([msg[readLen]])]);
                if (tmpBuf.buffer.length === 4) {
                    tmpBuf.len = tmpBuf.buffer.readUInt32BE(0);
                    tmpBuf.buffer = Buffer.allocUnsafe(tmpBuf.len);
                }
                readLen++;
            }
            else if (msg.length - readLen < tmpBuf.len) // data not coming all
            {
                msg.copy(tmpBuf.buffer, tmpBuf.buffer.length - tmpBuf.len, readLen);
                tmpBuf.len -= (msg.length - readLen);
                readLen = msg.length;
            }
            else {
                msg.copy(tmpBuf.buffer, tmpBuf.buffer.length - tmpBuf.len, readLen, readLen + tmpBuf.len);

                readLen += tmpBuf.len;
                tmpBuf.len = 0;
                let data = tmpBuf.buffer;
                tmpBuf.buffer = Buffer.allocUnsafe(0);

                //data coming all
                if (data[0] === 2) {    // 自定义消息
                    this.msgCache.push({ "id": data[1], "data": JSON.parse(data.slice(2).toString()) });
                } else if (data[0] === 1) { //握手成功消息
                    this.handshakeOver(JSON.parse(data.slice(1).toString()));
                }
            }
        }
    }

    /**
     * 握手成功
     * @param msg 
     */
    private handshakeOver(msg: { route: string[], heartbeat: number }) {
        for (let i = 0; i < msg.route.length; i++) {
            this.route[i] = msg.route[i];
        }
        this.msgCache.push({ "id": socket_cb_code.open, "data": null })

        if (msg.heartbeat > 0) {
            this.heartbeatTimer = setInterval(this.sendHeartbeat.bind(this), msg.heartbeat * 1000) as any;
        }
    }

    /**
     * 发送心跳
     */
    private sendHeartbeat() {
        // 心跳
        let buffer = Buffer.alloc(5);
        buffer[0] = (1 >> 24) & 0xff;
        buffer[1] = (1 >> 16) & 0xff;
        buffer[2] = (1 >> 8) & 0xff;
        buffer[3] = 1 & 0xff;
        buffer[4] = 2 & 0xff;
        this.netSocket.write(buffer);
    }


    /**
     * 关闭连接
     */
    close() {
        if (this.die) {
            return;
        }
        this.netSocket.emit("close");
        this.netSocket.destroy();
    }

    /**
     * 发送消息
     * @param cmdIndex 
     * @param _data 
     */
    send(cmdIndex: number, _data: any) {
        if (this.die) {
            return;
        }
        let buff = this.encode(cmdIndex, _data);
        this.netSocket.write(buff);
    }

    private encode(cmdIndex: number, _data: any) {
        if (_data === undefined) {
            _data = null;
        }
        let data = Buffer.from(JSON.stringify(_data));
        let msg_len = data.length + 2;
        let buffer = Buffer.allocUnsafe(msg_len + 4);
        let index = 0;
        buffer[index++] = (msg_len >> 24) & 0xff;
        buffer[index++] = (msg_len >> 16) & 0xff;
        buffer[index++] = (msg_len >> 8) & 0xff;
        buffer[index++] = msg_len & 0xff;
        buffer[index++] = 3 & 0xff;
        buffer[index++] = cmdIndex & 0xff;
        data.copy(buffer, index);
        return buffer;
    }

}
