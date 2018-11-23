using System.Collections;
using System.Collections.Generic;
using UnityEngine;

public class CameraFollow : MonoBehaviour
{

    private Transform mePlayer = null;
    public int smoothSpeed = 5;

    public void SetMePlayer(Transform _mePlayer)
    {
        mePlayer = _mePlayer;
    }

    // Update is called once per frame
    void Update()
    {
        if (mePlayer == null)
        {
            return;
        }

        transform.position = Vector3.Lerp(transform.position, new Vector3(mePlayer.position.x, mePlayer.position.y, transform.position.z), smoothSpeed * Time.deltaTime);

    }
}
