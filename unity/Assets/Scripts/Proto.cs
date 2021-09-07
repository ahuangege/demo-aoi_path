using System.Collections;
using System.Collections.Generic;
using UnityEngine;
using System;
namespace Proto
{
    [Serializable]
    class Login
    {
        public string username;
    }

    [Serializable]
    class EnterBack
    {
        public int width;
        public int height;
        public int towerWidth;
        public int towerHeight;
        public int tileWidth;
        public Entities entities;
        public List<Vec2> obstacles;
        public PlayerJson mePlayer;
    }

    [Serializable]
    class Entities
    {
        public List<PlayerJson> players;
        public List<ItemJson> items;
    }

    [Serializable]
    class PlayerJson
    {
        public int id;
        public int type;
        public float x;
        public float y;
        public string username;
        public int uid;
        public List<Vec2> path;
        public float speed;
    }

    [Serializable]
    class ItemJson
    {
        public int id;
        public int type;
        public float x;
        public float y;
    }

    [Serializable]
    class Vec2
    {
        public float x;
        public float y;
    }

    [Serializable]
    class MoveMsg
    {
        public int id;
        public float x;
        public float y;
        public List<Vec2> path;
    }

    [Serializable]
    class PickItem
    {
        public int id;
    }
    [Serializable]
    class RemoveEntities
    {
        public List<int> players;
        public List<int> items;
    }
}

