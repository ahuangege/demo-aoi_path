using System.Collections;
using System.Collections.Generic;
using UnityEngine;
using UnityEngine.SceneManagement;
using UnityEngine.Rendering;
using UnityEngine.UI;
using System;


public class Main : MonoBehaviour
{
    public static Main instance;
    public string host = "127.0.0.1";
    public int port = 4030;

    public float cameraSensitivity = 10f;
    public GameObject tilePrefab;
    public GameObject playerPrefab;
    public GameObject itemPrefab;

    private Transform tileParent;
    private Transform playerParent;
    private Transform itemParent;
    private Transform lineParent;
    private Transform borderParent;
    private Transform towerBorderParent;

    private int mapWidth = 0;
    private int mapHeight = 0;
    private int towerWidth = 0;
    private int towerHeight = 0;
    private int tileWidth = 0;

    private Transform mePlayer = null;

    private Transform wantPickItem = null;


    void Awake()
    {
        instance = this;
        Screen.SetResolution(960, 540, false);
    }

    // Use this for initialization
    void Start()
    {
        transform.Find("loginPanel").gameObject.SetActive(true);
        transform.Find("socketPanel").gameObject.SetActive(true);

        tileParent = GameObject.Find("tileParent").transform;
        playerParent = GameObject.Find("playerParent").transform;
        itemParent = GameObject.Find("itemParent").transform;
        lineParent = GameObject.Find("lineParent").transform;
        borderParent = GameObject.Find("borderParent").transform;
        towerBorderParent = GameObject.Find("towerBorderParent").transform;

        ConnectServer();
    }

    void ConnectServer()
    {
        SocketClient.Connect(host, port);
        SocketClient.OnOpen(OnAreaOpen);
        SocketClient.OnClose(OnAreaClose);
    }

    void OnAreaOpen(JSONObject msg)
    {
        Debug.Log("服务器连接成功");
        transform.Find("socketPanel").gameObject.SetActive(false);
        AddOrRemoveHandler(true);
    }
    void OnAreaClose(JSONObject msg)
    {
        Debug.Log("服务器连接失败，重载场景");
        StartCoroutine(ReloadScene());
    }
    IEnumerator ReloadScene()
    {
        transform.Find("socketPanel").gameObject.SetActive(true);
        transform.Find("socketPanel/Text").GetComponent<Text>().text = "服务器断开连接，等待重连。";
        yield return new WaitForSeconds(3f);
        SceneManager.LoadScene("main");
    }

    void SVR_areaEnterBack(JSONObject msg)
    {
        Destroy(transform.Find("loginPanel").gameObject);
        mapWidth = msg["width"].t;
        mapHeight = msg["height"].t;
        towerWidth = msg["towerWidth"].t;
        towerHeight = msg["towerHeight"].t;
        tileWidth = msg["tileWidth"].t;

        InitBorder();
        JSONObject mePlayerInfo = msg["mePlayer"];
        mePlayer = Create_player(mePlayerInfo["x"].f, mePlayerInfo["y"].f, mePlayerInfo["uid"].t);
        mePlayer.GetComponent<Player>().SetSpeed(mePlayerInfo["speed"].f);
        ResortLayer(playerParent);

        Camera.main.transform.position = new Vector3(mePlayer.position.x, mePlayer.position.y, Camera.main.transform.position.z);
        Camera.main.GetComponent<CameraFollow>().SetMePlayer(mePlayer);

        CreateObstacles(msg["obstacles"]);
        SVR_onAddEntities(msg["entities"]);
    }

    public void SVR_Enter_Area(string username)
    {
        JSONObject tmp = new JSONObject();
        tmp.AddField("username", username);
        SocketClient.SendMsg("area.main.enter", tmp);
    }

    // Update is called once per frame
    void Update()
    {
        SocketClient.ReadMsg();

        if (mePlayer != null && Input.GetMouseButtonDown(1))
        {
            Vector3 pos = Camera.main.ScreenToWorldPoint(Input.mousePosition);
            pos.x = Float2Decimal(pos.x);
            pos.y = Float2Decimal(pos.y);
            if (pos.x <= 0 || pos.x >= mapWidth || pos.y <= 0 || pos.y >= mapHeight)
            {
                return;
            }

            RaycastHit2D hit = Physics2D.Raycast(pos, Vector2.zero);
            wantPickItem = null;
            if (hit.collider != null)
            {
                wantPickItem = hit.transform;
                if (PickItem())
                {
                    // 拾取物品
                    wantPickItem = null;
                    return;
                }
                else
                {
                    wantPickItem = hit.transform;
                }
            }
            SVR_SendMove(pos.x, pos.y);
        }

        if (Input.GetAxis("Mouse ScrollWheel") != 0)
        {
            float fov = Camera.main.orthographicSize;
            fov -= Input.GetAxis("Mouse ScrollWheel") * cameraSensitivity;
            fov = Mathf.Clamp(fov, 1, 35);
            Camera.main.orthographicSize = fov;
        }
    }

    private float Float2Decimal(float num)
    {
        return (float)Math.Round(num, 2);
    }

    /// <summary>
    /// 向服务器请求移动
    /// </summary>
    /// <param name="x1"></param>
    /// <param name="y1"></param>
    void SVR_SendMove(float x1, float y1)
    {
        JSONObject tmp = new JSONObject();
        tmp.AddField("x1", x1);
        tmp.AddField("y1", y1);
        SocketClient.SendMsg("area.main.move", tmp);
    }

    void SVR_onMove(JSONObject msg)
    {
        Transform one = playerParent.Find(msg["uid"].t.ToString());
        if (one == null)
        {
            return;
        }
        List<Vector3> path = PathTransfer(msg["path"]);
        one.GetComponent<Player>().SetPath(msg["x"].f, msg["y"].f, path);
    }

    List<Vector3> PathTransfer(JSONObject path)
    {
        List<Vector3> endPath = new List<Vector3>();
        for (int i = 0, len = path.list.Count; i < len; i++)
        {
            endPath.Add(new Vector3(path[i]["x"].f, path[i]["y"].f, 0));
        }
        return endPath;
    }


    /// <summary>
    /// 生成边界
    /// </summary>
    void InitBorder()
    {
        Transform tmp;

        // 左边
        tmp = Instantiate(tilePrefab, borderParent).transform;
        tmp.localScale = new Vector3(0.2f, mapHeight, 1);
        tmp.localPosition = new Vector3(0, mapHeight / 2f, 0);
        tmp.GetComponent<SpriteRenderer>().color = Color.red;

        // 右边
        tmp = Instantiate(tilePrefab, borderParent).transform;
        tmp.localScale = new Vector3(0.2f, mapHeight, 1);
        tmp.localPosition = new Vector3(mapWidth, mapHeight / 2f, 0);
        tmp.GetComponent<SpriteRenderer>().color = Color.red;

        // 上边
        tmp = Instantiate(tilePrefab, borderParent).transform;
        tmp.localScale = new Vector3(mapWidth, 0.2f, 1);
        tmp.localPosition = new Vector3(mapWidth / 2f, mapHeight, 0);
        tmp.GetComponent<SpriteRenderer>().color = Color.red;

        // 下边
        tmp = Instantiate(tilePrefab, borderParent).transform;
        tmp.localScale = new Vector3(mapWidth, 0.2f, 1);
        tmp.localPosition = new Vector3(mapWidth / 2f, 0, 0);
        tmp.GetComponent<SpriteRenderer>().color = Color.red;

        ResortLayer(borderParent);

        // 灯塔边界
        for (int i = 0; i <= Math.Ceiling(mapHeight * 1f / towerHeight); i++)
        {
            tmp = Instantiate(tilePrefab, towerBorderParent).transform;
            tmp.localScale = new Vector3(mapWidth, 0.2f, 1);
            tmp.localPosition = new Vector3(mapWidth / 2f, towerHeight * i, 0);
            tmp.GetComponent<SpriteRenderer>().color = Color.yellow;
        }

        for (int i = 0; i <= Math.Ceiling(mapWidth * 1f / towerWidth); i++)
        {
            tmp = Instantiate(tilePrefab, towerBorderParent).transform;
            tmp.localScale = new Vector3(0.2f, mapHeight, 1);
            tmp.localPosition = new Vector3(towerWidth * i, mapHeight / 2f, 0);
            tmp.GetComponent<SpriteRenderer>().color = Color.yellow;
        }

        ResortLayer(towerBorderParent);

        // 格子线
        for (int i = 0; i <= Math.Ceiling(mapHeight * 1f / tileWidth); i++)
        {
            tmp = Instantiate(tilePrefab, lineParent).transform;
            tmp.localScale = new Vector3(mapWidth, 0.1f, 1);
            tmp.localPosition = new Vector3(mapWidth / 2f, i * tileWidth, 0);
            tmp.GetComponent<SpriteRenderer>().color = Color.grey;
        }

        for (int i = 0; i <= mapWidth; i++)
        {
            tmp = Instantiate(tilePrefab, lineParent).transform;
            tmp.localScale = new Vector3(0.1f, mapHeight, 1);
            tmp.localPosition = new Vector3(i * tileWidth, mapHeight / 2, 0);
            tmp.GetComponent<SpriteRenderer>().color = Color.grey;
        }
        ResortLayer(lineParent);

    }

    /// <summary>
    /// 重新设置SortingGroup（bug）
    /// </summary>
    /// <param name="trsm"></param>
    private void ResortLayer(Transform trsm)
    {
        int tmpOrder = trsm.GetComponent<SortingGroup>().sortingOrder;
        trsm.GetComponent<SortingGroup>().sortingOrder = 0;
        trsm.GetComponent<SortingGroup>().sortingOrder = tmpOrder;

    }

    public bool PickItem()
    {
        if(wantPickItem == null)
        {
            return false;
        }
        if(Vector2.Distance(wantPickItem.position, mePlayer.position) > 0.5f)
        {
            return false;
        }
        JSONObject msg = new JSONObject();
        msg.AddField("id", wantPickItem.transform.name);
        SocketClient.SendMsg("area.main.pickItem", msg);
        return true;
    }

    void SVR_onAddEntities(JSONObject msg)
    {
        if (msg.HasField("item"))
        {
            CreateItems(msg["item"]);
        }

        if (msg.HasField("player"))
        {
            CreatePlayers(msg["player"]);
        }
    }

    void SVR_onRemoveEntities(JSONObject msg)
    {
        if (msg.HasField("item"))
        {
            for (int i = 0, len = msg["item"].Count; i < len; i++)
            {
                Transform trsm = itemParent.Find(msg["item"][i].t.ToString());
                if (trsm)
                {
                    Destroy(trsm.gameObject);
                }
            }
        }

        if (msg.HasField("player"))
        {
            for (int i = 0, len = msg["player"].Count; i < len; i++)
            {
                Transform trsm = playerParent.Find(msg["player"][i].t.ToString());
                if (trsm)
                {
                    Destroy(trsm.gameObject);
                }
            }
        }
    }

    void CreateItems(JSONObject msg)
    {
        for (int i = 0, len = msg.Count; i < len; i++)
        {
            GameObject item = Instantiate(itemPrefab, itemParent);
            item.name = msg[i]["id"].t.ToString();
            item.transform.localPosition = new Vector3(msg[i]["x"].f, msg[i]["y"].f, 0);
        }
        ResortLayer(itemParent);
    }

    void CreatePlayers(JSONObject msg)
    {
        for (int i = 0, len = msg.Count; i < len; i++)
        {
            JSONObject one = msg[i];
            Transform player = Create_player(one["x"].f, one["y"].f, one["uid"].t);
            Player tmp = player.GetComponent<Player>();
            tmp.SetPath(one["x"].f, one["y"].f, PathTransfer(one["path"]));
            tmp.SetSpeed(one["speed"].f);
        }
        ResortLayer(playerParent);
    }
    private Transform Create_player(float x, float y, int uid)
    {
        Transform player = Instantiate(playerPrefab, playerParent).transform;
        player.localPosition = new Vector3(x, y, 0);
        player.name = uid.ToString();
        return player;
    }

    void CreateObstacles(JSONObject msg)
    {
        for (int i = 0, len = msg.Count; i < len; i++)
        {
            float x = msg[i]["x"].t * tileWidth + tileWidth / 2f;
            float y = msg[i]["y"].t * tileWidth + tileWidth / 2f;
            Transform trsm = Create_tile(x, y);
            trsm.GetComponent<SpriteRenderer>().color = Color.red;
        }
        ResortLayer(tileParent);
    }

    private Transform Create_tile(float x, float y)
    {
        Transform tile = Instantiate(tilePrefab, tileParent).transform;
        tile.localPosition = new Vector3(x, y, 0);
        return tile;
    }



    void AddOrRemoveHandler(bool isAdd)
    {
        if (isAdd)
        {
            SocketClient.AddHandler("area.main.enter", SVR_areaEnterBack);
            SocketClient.AddHandler("onMove", SVR_onMove);
            SocketClient.AddHandler("onAddEntities", SVR_onAddEntities);
            SocketClient.AddHandler("onRemoveEntities", SVR_onRemoveEntities);
        }
        else
        {
            SocketClient.RemoveHandler("area.main.enter");
            SocketClient.RemoveHandler("onMove");
            SocketClient.RemoveHandler("onAddEntities");
            SocketClient.RemoveHandler("onRemoveEntities");
        }

    }

    private void OnDestroy()
    {
        AddOrRemoveHandler(false);
    }
}
