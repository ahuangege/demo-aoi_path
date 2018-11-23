using System.Collections;
using System.Collections.Generic;
using UnityEngine;

public class Player : MonoBehaviour
{

    private List<Vector3> path = new List<Vector3>();

    float speed = 2f;

    float diffDistance = 0;    // 位置补偿
    float diffSpeed = 0f;   // 补偿位置需要的速度

    public void SetSpeed(float _speed)
    {
        speed = _speed;
    }

    public void SetPath(float x, float y, List<Vector3> _path)
    {
        if (_path.Count == 0)
        {
            transform.position = new Vector3(x, y, 0);
            return;
        }
        path = _path;
        diffDistance = Vector2.Distance(transform.position, new Vector2(x, y));

        float diffLen = 0;  // 在此距离内完成补偿
        Vector2 startPos = transform.position;
        int diffIndex = path.Count > 3 ? 3 : path.Count;
        for (int i = 0; i < diffIndex; i++)
        {
            diffLen += Vector2.Distance(startPos, path[i]);
            startPos = path[i];
        }
        diffSpeed = diffDistance / (diffLen / speed);
    }


    // Update is called once per frame
    void Update()
    {
        if (path.Count > 0)
        {
            Vector3 pos = path[0];
            float moveDistance = speed * Time.deltaTime;
            if (diffSpeed > 0)
            {
                float diffDis = diffSpeed * Time.deltaTime;
                diffDistance -= diffDis;
                if (diffDistance <= 0)
                {
                    diffSpeed = 0;
                }
                moveDistance += diffDis;
            }

            Vector3 dir = pos - transform.position;
            if (moveDistance >= dir.magnitude)
            {
                path.RemoveAt(0);
                moveDistance = dir.magnitude;
                if (path.Count == 0)
                {
                    Main.instance.PickItem();
                }
            }
            transform.Translate(dir.normalized * moveDistance);
        }
    }
}
