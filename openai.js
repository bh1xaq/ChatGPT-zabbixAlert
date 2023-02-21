// @see https://docs.aircode.io/guide/functions/
const aircode = require('aircode');
var axios = require('axios');

// 通过 OpenAI API 获取砖家意见
async function getOpenAIReply(content) {
    var prompt = "请问 Zabbix 告警 " + content + " 应该如何处理。";

    var data = JSON.stringify({
        "model": "text-davinci-003",
        "prompt": prompt,
        "max_tokens": 1024,
        "temperature": 0.9,
        "frequency_penalty": 0.0,
        "presence_penalty": 0.0,
        "top_p": 1,
        "stop": ["#"]
    });

    var config = {
        method: 'post',
        maxBodyLength: Infinity,
        url: 'https://api.openai.com/v1/completions',
        headers: {
            'Authorization': `Bearer ${process.env.OPENAIKEY}`,
            'Content-Type': 'application/json'
        },
        data: data
    };

    const response = await axios(config)
    // 去除多余的换行
    return response.data.choices[0].text.replace("\n\n", "")
}

module.exports = async function (params, context) {
    console.log('Received params:', params);
    if (params.zakey == process.env.ZAKEY) {
        // 鉴权成功，处理问题
        res = await getOpenAIReply(params.quesion)
        return {
            message: res
        }
    }
    return {
        message: '403...',
    };
}
