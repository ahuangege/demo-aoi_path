using System.Collections;
using System.Collections.Generic;
using UnityEngine;
using UnityEngine.UI;

public class Login : MonoBehaviour
{

    public InputField nameInput;
    public Text infoText;

    public void Btn_enter()
    {
        string username = nameInput.text;
        if (username.Contains(" "))
        {
            SetInfoText("用户名不可包含空格");
            return;
        }
        Main.instance.SVR_Enter_Area(username.Trim());
    }

    void SetInfoText(string info)
    {
        infoText.text = info;
    }
}
