var weworkApp = {
    touser: null,
    message: null,
    corpid: null,
    corpsecret: null,
    agentid: null,
    proxy: null,
    openai_url: null,
    zakey: null,
    msgtype: 'text',

    // 获取企业微信 AccessToken
    getAccessToken: function () {
        var url = 'https://qyapi.weixin.qq.com/cgi-bin/gettoken?corpid=' + weworkApp.corpid + '&corpsecret=' + weworkApp.corpsecret,
            request = new CurlHttpRequest();

        // 设置代理
        if (weworkApp.proxy) {
            request.setProxy(weworkApp.proxy);
        }
        request.AddHeader('Content-Type: application/json');
        response = request.Get(url);
        try {
            response = JSON.parse(response);
            return response.access_token;
        }
        catch (error) {
            response = null;
        }
        if (request.Status() !== 200 || response.errcode !== 0) {
            if (typeof response.errmsg === 'string') {
                throw response.errmsg;
            }
            else {
                throw 'Unknown error. Check debug log for more information.'
            }
        }
    },

    askOpenAI: function (quesion) {
        // OpenAI Proxy On AirCode
        var url = weworkApp.openai_url,
            request = new CurlHttpRequest(),
            data = {
                "zakey": weworkApp.zakey,
                "quesion": quesion
            };

        // 设置代理
        if (weworkApp.proxy) {
            request.setProxy(weworkApp.proxy);
        }
        request.AddHeader('Content-Type: application/json');
        response = request.Post(url, JSON.stringify(data));
        try {
            response = JSON.parse(response);
        }
        catch (error) {
            response = { message: "" };
        }
        return response.message;
    },

    // 发消息
    sendMessage: function (access_token) {
        var params = {
            touser: weworkApp.touser,
            agentid: weworkApp.agentid,
            msgtype: weworkApp.msgtype,
            text: {
                content: weworkApp.message
            },
            enable_duplicate_check: 1,
            duplicate_check_interval: 20
        },
            data,
            response,
            request = new CurlHttpRequest(),
            url = 'https://qyapi.weixin.qq.com/cgi-bin/message/send?access_token=' + access_token;

        // 设置代理
        if (weworkApp.proxy) {
            request.setProxy(weworkApp.proxy);
        }

        request.AddHeader('Content-Type: application/json');
        data = JSON.stringify(params);

        // 在日志中不展示 AccessToken
        Zabbix.Log(4, '[weworkApp Webhook] URL: ' + url.replace(weworkApp.access_token, '<ACCESS_TOKEN>'));
        Zabbix.Log(4, '[weworkApp Webhook] params: ' + data);
        response = request.Post(url, data);
        Zabbix.Log(4, '[weworkApp Webhook] HTTP code: ' + request.Status());

        try {
            response = JSON.parse(response);
        }
        catch (error) {
            response = null;
        }

        if (request.Status() !== 200 || response.errcode !== 0) {
            if (typeof response.errmsg === 'string') {
                throw response.errmsg;
            }
            else {
                throw 'Unknown error. Check debug log for more information.'
            }
        }
    }
}

try {
    var params = JSON.parse(value);
    if (params.HTTPProxy) {
        weworkApp.proxy = params.HTTPProxy;
    }
    weworkApp.agentid = params.Agentid;
    weworkApp.corpid = params.Corpid;
    weworkApp.corpsecret = params.Corpsecret;
    weworkApp.touser = params.To;
    weworkApp.openai_url = params.Openaiurl;
    weworkApp.zakey = params.Zakey;
    var access_token = weworkApp.getAccessToken();
    weworkApp.message = params.Subject + '\n' + params.Message;

    //如果是故障类型的通知，就问一下 OpenAI
    if (params.Subject.indexOf("故障恢复") == -1) {
        var aiAnswer = weworkApp.askOpenAI(params.Subject);
        weworkApp.message = weworkApp.message + '\n --- \n OpenAI 砖家建议：\n ' + aiAnswer;
    }
    // 发企业微信应用通知
    weworkApp.sendMessage(access_token);
    return '200 OK';
}
catch (error) {
    Zabbix.Log(4, '[weworkApp Webhook] notification failed: ' + error);
    throw 'Sending failed: ' + error + '.';
}