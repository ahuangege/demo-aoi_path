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

    void OnAreaOpen(string msg)
    {
        Debug.Log("服务器连接成功");
        transform.Find("socketPanel").gameObject.SetActive(false);
        AddOrRemoveHandler(true);
    }
    void OnAreaClose(string msg)
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

    void SVR_areaEnterBack(string data)
    {
        Proto.EnterBack msg = JsonUtility.FromJson<Proto.EnterBack>(data);
        Destroy(transform.Find("loginPanel").gameObject);
        mapWidth = msg.width;
        mapHeight = msg.height;
        towerWidth = msg.towerWidth;
        towerHeight = msg.towerHeight;
        tileWidth = msg.tileWidth;

        InitBorder();
        mePlayer = Create_player(msg.mePlayer.x, msg.mePlayer.y, msg.mePlayer.id);
        mePlayer.GetComponent<Player>().SetSpeed(msg.mePlayer.speed);
        ResortLayer(playerParent);

        Camera.main.transform.position = new Vector3(mePlayer.position.x, mePlayer.position.y, Camera.main.transform.position.z);
        Camera.main.GetComponent<CameraFollow>().SetMePlayer(mePlayer);

        CreateObstacles(msg.obstacles);
        CreateItems(msg.entities.items);
        CreatePlayers(msg.entities.players);
    }

    public void SVR_Enter_Area(string username)
    {
        Proto.Login msg = new Proto.Login();
        msg.username = username;
        SocketClient.SendMsg("area.main.enter", msg);
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
        Proto.Vec2 tmp = new Proto.Vec2();
        tmp.x = x1;
        tmp.y = y1;
        SocketClient.SendMsg("area.main.move", tmp);
    }

    void SVR_onMove(string data)
    {
        Proto.MoveMsg msg = JsonUtility.FromJson<Proto.MoveMsg>(data);
        Transform one = playerParent.Find(msg.id.ToString());
        if (one == null)
        {
            return;
        }
        one.GetComponent<Player>().SetPath(msg.x, msg.y, TransferPath(msg.path));
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
        if (wantPickItem == null)
        {
            return false;
        }
        if (Vector2.Distance(wantPickItem.position, mePlayer.position) > 0.5f)
        {
            return false;
        }
        Proto.PickItem msg = new Proto.PickItem();
        msg.id = int.Parse(wantPickItem.transform.name);
        SocketClient.SendMsg("area.main.pickItem", msg);
        return true;
    }

    void SVR_onAddEntities(string data)
    {
        Proto.Entities msg = JsonUtility.FromJson<Proto.Entities>(data);
        CreateItems(msg.items);
        CreatePlayers(msg.players);
    }

    void SVR_onRemoveEntities(string data)
    {
        Proto.RemoveEntities msg = JsonUtility.FromJson<Proto.RemoveEntities>(data);
        foreach (var one in msg.items)
        {
            Transform trsm = itemParent.Find(one.ToString());
            if (trsm)
            {
                Destroy(trsm.gameObject);
            }
        }

        foreach (var one in msg.players)
        {
            Transform trsm = playerParent.Find(one.ToString());
            if (trsm)
            {
                Destroy(trsm.gameObject);
            }
        }
    }

    void CreateItems(List<Proto.ItemJson> msg)
    {
        for (int i = 0, len = msg.Count; i < len; i++)
        {
            GameObject item = Instantiate(itemPrefab, itemParent);
            item.name = msg[i].id.ToString();
            item.transform.localPosition = new Vector3(msg[i].x, msg[i].y, 0);
        }
        ResortLayer(itemParent);
    }

    void CreatePlayers(List<Proto.PlayerJson> msg)
    {
        for (int i = 0, len = msg.Count; i < len; i++)
        {
            var one = msg[i];
            Transform player = Create_player(one.x, one.y, one.id);
            Player tmp = player.GetComponent<Player>();
            tmp.SetPath(one.x, one.y, TransferPath(one.path));
            tmp.SetSpeed(one.speed);
        }
        ResortLayer(playerParent);
    }
    List<Vector2> TransferPath(List<Proto.Vec2> path)
    {
        List<Vector2> tmp = new List<Vector2>();
        foreach (var one in path)
        {
            tmp.Add(new Vector2(one.x, one.y));
        }
        return tmp;
    }

    private Transform Create_player(float x, float y, int id)
    {
        Transform player = Instantiate(playerPrefab, playerParent).transform;
        player.localPosition = new Vector3(x, y, 0);
        player.name = id.ToString();
        return player;
    }

    void CreateObstacles(List<Proto.Vec2> msg)
    {
        for (int i = 0, len = msg.Count; i < len; i++)
        {
            float x = msg[i].x * tileWidth + tileWidth / 2f;
            float y = msg[i].y * tileWidth + tileWidth / 2f;
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
