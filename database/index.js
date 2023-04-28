const AWS = require("aws-sdk");
AWS.config.update({
    region: 'us-east-1'
})
const dynamodb = new AWS.DynamoDB.DocumentClient();
const dynamodbTableName = "RANS";
const healthPath = '/health';
const dataPath = '/data';
const datasPath = '/datas';

exports.handler = async function(event) {
    console.log('Request event: ', event);
    let response;
    switch(true) {
        case event.httpMethod === 'GET' && event.path === healthPath:
            response = buildResponse(200);
            break;
        case event.httpMethod === 'GET' && event.path === dataPath:
            response = await getData(event.queryStringParameters.riskID)
            break;
        case event.httpMethod === 'GET' && event.path === datasPath:
            response = await getDatas();
            break;
        case event.httpMethod === 'POST' && event.path === dataPath:
            response = await saveData(JSON.parse(event.body));
            break;
        // case event.httpMethod === 'PATCH' && event.path === dataPath:
        //     const requestBody = JSON.parse(event.body);
        //     response = await editData(requestBody.riskID, requestBody.updateKey, requestBody.updateValue);
        //     break;
        // case event.httpMethod === 'DELETE' && event.path === dataPath:
        //     response = await deleteData(JSON.parse(event.body.riskID));
        //     break;
        default:
            response = buildResponse(404, '404 Not Found');
    }
    return response
}

async function getData(riskID) {
    const params = {
        TableName: dynamodbTableName,
        Key: {
            'riskID': riskID
        }
    }
    return await dynamodb.get(params).promise().then((response) => {
        return buildResponse(200, response.Item);
    }, (error) => {
        console.error("Error: ", error);
    });
}

async function getDatas() {
    const params = {
        TableName: dynamodbTableName
    }
    const allDatas = await scanDynamoRecords(params, []);
    const body = {
        datas: allDatas
    }
    return buildResponse(200, body);
}

async function scanDynamoRecords(scanParams, itemArray) {
    try {
        const dynamoData = await dynamodb.scan(scanParams).promise();
        itemArray = itemArray.concat(dynamoData.Items);
        if (dynamoData.LastEvaluatedKey) {
            scanParams.ExclusiveStartkey = dynamoData.LastEvaluatedKey;
            return await scanDynamoRecords(scanParams, itemArray);
        }
        return itemArray;
    } catch (error) {
        console.error("Error: ", error);
    }
}

async function saveData(requestBody) {
    const params = {
        TableName: dynamodbTableName,
        Item: requestBody
    }
    return await dynamodb.put(params).promise().then(() => {
        const body = {
            Operation: 'SAVE',
            Message: 'SUCCESS',
            Item: requestBody
        }
        return buildResponse(200, body);
    }, (error) => {
        console.error("Error: ", error);
    })
}

function buildResponse(statusCode, body) {
    return {
        statusCode: statusCode,
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(body)
    }
}