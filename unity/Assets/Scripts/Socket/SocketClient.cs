using System;
using System.Collections;
using System.Collections.Generic;
using System.Net.Sockets;
using System.Text;
using UnityEngine;
using System.Timers;

/// <summary>
/// socket静态类
/// </summary>
public static class SocketClient
{
    private static SocketClientChild nowSocket = null;                                                                      //当前socket
    private static List<string> route = new List<string>();                                           //路由数组
    private static Dictionary<int, Action<JSONObject>> handlers = new Dictionary<int, Action<JSONObject>>();          //路由处理函数
    private static List<SocketMsg> msgCache = new List<SocketMsg>();                                                              //缓存的消息列表
    private static JSONObject nullObj = new JSONObject();

    /// <summary>
    /// 注册路由
    /// </summary>
    /// <param name="cmd">路由名称</param>
    /// <param name="handler">路由函数</param>
    public static void AddHandler(string cmd, Action<JSONObject> handler)
    {
        int index = route.IndexOf(cmd);
        if (index == -1)
        {
            Debug.Log("cmd not exists: " + cmd);
            return;
        }
        handlers[index] = handler;
    }

    /// <summary>
    /// 移除路由
    /// </summary>
    /// <param name="cmd">路由名称</param>
    public static void RemoveHandler(string cmd)
    {
        int index = route.IndexOf(cmd);
        handlers.Remove(index);
    }

    /// <summary>
    /// socket关闭事件的回调
    /// </summary>
    /// <param name="handler">回调函数</param>
    public static void OnClose(Action<JSONObject> handler)
    {
        handlers[-2] = handler;
    }

    /// <summary>
    /// 移除关闭事件的回调
    /// </summary>
    public static void OffClose()
    {
        handlers.Remove(-2);
    }

    /// <summary>
    ///  socket打开事件的回调
    /// </summary>
    /// <param name="handler">回调函数</param>
    public static void OnOpen(Action<JSONObject> handler)
    {
        handlers[-1] = handler;
    }

    /// <summary>
    /// 移除打开事件的回调
    /// </summary>
    public static void OffOpen()
    {
        handlers.Remove(-1);
    }

    /// <summary>
    /// 断开socket连接
    /// </summary>
    public static void DisConnect()
    {
        if (nowSocket != null)
        {
            nowSocket.DisConnect();
        }
    }

    /// <summary>
    /// 连接服务器
    /// </summary>
    /// <param name="host">ip</param>
    /// <param name="port">端口</param>
    public static void Connect(string host, int port)
    {
        DisConnect();
        nowSocket = new SocketClientChild();
        nowSocket.Connect(host, port);
    }

    /// <summary>
    /// 发送消息
    /// </summary>
    /// <param name="cmd">路由名称</param>
    /// <param name="data">数据</param>
    public static void SendMsg(string cmd, JSONObject data = null)
    {
        int cmdIndex = route.IndexOf(cmd);
        if (cmdIndex == -1)
        {
            Debug.Log("cmd not exists: " + cmd);
            return;
        }
        if (data == null)
        {
            data = nullObj;
        }
        if (nowSocket != null)
        {
            nowSocket.Send(cmdIndex, data);
        }
    }


    /// <summary>
    /// 读取消息
    /// </summary>
    public static void ReadMsg()
    {
        if (msgCache.Count > 0)
        {
            SocketMsg msg = msgCache[0];
            msgCache.RemoveAt(0);
            if (handlers.ContainsKey(msg.msgId))
            {
                handlers[msg.msgId](msg.msg);
            }
        }
    }


    private class SocketClientChild
    {
        private Socket mySocket = null;         //原生socket
        private bool isDead = false;            //是否已被弃用
        private Timer heartbeatTimer = null;    // 心跳

        public void DisConnect()
        {
            if (!isDead)
            {
                nowSocket = null;
                isDead = true;
                SocketClose();
                if (heartbeatTimer != null)
                {
                    heartbeatTimer.Close();
                }
                try
                {
                    mySocket.Shutdown(SocketShutdown.Both);
                    mySocket.Close();
                }
                catch (Exception e)
                {
                    Debug.Log(e.ToString());
                }
            }
        }

        public void Send(int cmdIndex, JSONObject data)
        {
            byte[] bytes = Encode(cmdIndex, data);
            try
            {
                mySocket.BeginSend(bytes, 0, bytes.Length, SocketFlags.None, null, null);
            }
            catch (Exception e)
            {
                Debug.Log(e.ToString());
                SocketClose();
            }
        }

        public void Connect(string host, int port)
        {
            mySocket = new Socket(AddressFamily.InterNetwork, SocketType.Stream, ProtocolType.Tcp);
            mySocket.BeginConnect(host, port, AsyncConnectCallback, mySocket);
        }

        private void AsyncConnectCallback(IAsyncResult result)
        {

            try
            {   // 异步写入结束 
                mySocket.EndConnect(result);
                Recive();

                // 握手
                byte[] bytes = new byte[5];
                bytes[0] = 1 >> 24 & 0xff;
                bytes[1] = 1 >> 16 & 0xff;
                bytes[2] = 1 >> 8 & 0xff;
                bytes[3] = 1 & 0xff;
                bytes[4] = 1 & 0xff;
                mySocket.BeginSend(bytes, 0, bytes.Length, SocketFlags.None, null, null);
            }
            catch (Exception e)
            {
                Debug.Log(e.ToString());
                SocketClose();
            }
        }

        private byte[] Encode(int cmd, JSONObject data)
        {
            byte[] byteMsg = Encoding.UTF8.GetBytes(data.ToString());
            int len = byteMsg.Length + 2;
            List<byte> byteSource = new List<byte>();
            byteSource.Add((byte)(len >> 24 & 0xff));
            byteSource.Add((byte)(len >> 16 & 0xff));
            byteSource.Add((byte)(len >> 8 & 0xff));
            byteSource.Add((byte)(len & 0xff));
            byteSource.Add((byte)(3 & 0xff));
            byteSource.Add((byte)(cmd & 0xff));
            byteSource.AddRange(byteMsg);
            return byteSource.ToArray();
        }

        private int msgLen = 0;
        private List<byte> msgBytes = new List<byte>();
        private byte[] data = new byte[1024];
        private void Recive()
        {
            try
            {
                //开始接收数据  
                mySocket.BeginReceive(data, 0, data.Length, SocketFlags.None,
                asyncResult =>
                {
                    int length = mySocket.EndReceive(asyncResult);
                    ReadData(length);
                    Recive();
                }, null);
            }
            catch (Exception e)
            {
                Debug.Log(e.ToString());
                SocketClose();
            }
        }

        private void ReadData(int length)
        {
            int readLen = 0;
            while (readLen < length)
            {
                if (msgLen == 0)    //数据长度未确定
                {
                    msgBytes.Add(data[readLen]);
                    if (msgBytes.Count == 4)
                    {
                        msgLen = (msgBytes[0] << 24) | (msgBytes[1] << 16) | (msgBytes[2] << 8) | msgBytes[3];
                        msgBytes.Clear();
                    }
                    readLen++;
                }
                else if (length - readLen < msgLen) //数据未全部到达
                {
                    for (int i = readLen; i < length; i++)
                    {
                        msgBytes.Add(data[i]);
                    }
                    msgLen -= (length - readLen);
                    readLen = length;
                }
                else
                {
                    for (int i = readLen; i < readLen + msgLen; i++)
                    {
                        msgBytes.Add(data[i]);
                    }
                    readLen += msgLen;
                    msgLen = 0;
                    List<byte> tmpBytes = msgBytes;
                    msgBytes = new List<byte>();

                    if (tmpBytes[0] == 2)   // 消息
                    {
                        SocketMsg msg = new SocketMsg();
                        msg.msgId = tmpBytes[1];
                        msg.msg = new JSONObject(Encoding.UTF8.GetString(tmpBytes.GetRange(2, tmpBytes.Count - 2).ToArray()));
                        pushMsg(msg);
                    }
                    else if (tmpBytes[0] == 1)   // 握手回调
                    {
                        JSONObject msg = new JSONObject(Encoding.UTF8.GetString(tmpBytes.GetRange(1, tmpBytes.Count - 1).ToArray()));
                        DealHandshake(msg);
                    }
                }
            }

        }

        private void DealHandshake(JSONObject msg)
        {
            if (msg["heartbeat"].t > 0)
            {
                heartbeatTimer = new Timer();
                heartbeatTimer.Elapsed += SendHeartbeat;
                heartbeatTimer.Interval = msg["heartbeat"].t * 1000;
                heartbeatTimer.Enabled = true;
            }
            SocketClient.route = new List<string>();
            for (int i = 0; i < msg["route"].Count; i++)
            {
                SocketClient.route.Add(msg["route"].list[i].str);
            }
            SocketMsg openMsg = new SocketMsg();
            openMsg.msgId = -1;
            pushMsg(openMsg);
        }

        private void SendHeartbeat(object source, ElapsedEventArgs e)
        {
            // 心跳
            byte[] bytes = new byte[5];
            bytes[0] = 1 >> 24 & 0xff;
            bytes[1] = 1 >> 16 & 0xff;
            bytes[2] = 1 >> 8 & 0xff;
            bytes[3] = 1 & 0xff;
            bytes[4] = 2 & 0xff;
            try
            {
                mySocket.BeginSend(bytes, 0, bytes.Length, SocketFlags.None, null, null);
            }
            catch (Exception e1)
            {
                Debug.Log(e1);
                SocketClose();
            }

        }

        private void SocketClose()
        {
            if (!isDead)
            {
                SocketMsg msg = new SocketMsg();
                msg.msgId = -2;
                pushMsg(msg);
                DisConnect();
            }
        }
        private void pushMsg(SocketMsg msg)
        {
            msgCache.Add(msg);
        }
    }

    //接收到的消息结构
    private class SocketMsg
    {
        public int msgId = 0;
        public JSONObject msg = null;
    }
}
