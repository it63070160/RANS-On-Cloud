const AWS = require("aws-sdk");
AWS.config.update({
    region: 'us-east-1'
})
const dynamodb = new AWS.DynamoDB.DocumentClient();
const dynamodbTableName = "RANS";
const dynamodbTableName_Dev = "RANS-Dev";
const healthPath = '/health';
const devPath = '/dev';
const devsPath = '/devs';
const dataPath = '/data';
const datasPath = '/datas';
const datasAPIPath = '/datas/apiRisk';

exports.handler = async function(event) {
    console.log('Request event: ', event);
    let response;
    switch(true) {
        case event.httpMethod === 'GET' && event.path === healthPath:
            response = buildResponse(200);
            break;
        case event.httpMethod === 'GET' && event.path === dataPath:
            response = await getData(event.queryStringParameters.riskID);
            break;
        case event.httpMethod === 'GET' && event.path === datasPath:
            response = await getDatas();
            break;
        case event.httpMethod === 'GET' && event.path === datasAPIPath:
            response = await getAPIRisk();
            break;
        case event.httpMethod === 'GET' && event.path === devPath:
            response = await getDev(event.queryStringParameters.key);
            break;
        case event.httpMethod === 'GET' && event.path === devsPath:
            response = await getDevs();
            break;
        case event.httpMethod === 'POST' && event.path === dataPath:
            response = await saveData(JSON.parse(event.body));
            break;
        case event.httpMethod === 'POST' && event.path === devPath:
            response = await saveDev(JSON.parse(event.body));
            break;
        case event.httpMethod === 'PUT' && event.path === dataPath:
            const requestBody = JSON.parse(event.body);
            response = await editData(requestBody.riskID, requestBody.updateKey, requestBody.updateValue);
            break;
        case event.httpMethod === 'DELETE' && event.path === dataPath:
            response = await deleteData(JSON.parse(event.body).riskID);
            break;
        case event.httpMethod === 'DELETE' && event.path === devPath:
            response = await deleteDev(JSON.parse(event.body).key);
            break;
        default:
            response = buildResponse(404, "404 Not Found");
    }
    return response
}

async function getData(riskID) {
    const params = {
        TableName: dynamodbTableName,
        Key: {
            "riskID": parseInt(riskID)
        }
    }
    return await dynamodb.get(params).promise().then((response) => {
        return buildResponse(200, response.Item);
    }, (error) => {
        console.error("Error: ", error);
    });
}

async function getDev(key) {
    const params = {
        TableName: dynamodbTableName_Dev,
        Key: {
            "key": parseInt(key)
        }
    }
    return await dynamodb.get(params).promise().then((response) => {
        return buildResponse(200, response.Item);
    }, (error) => {
        console.error("Error: ", error);
    });
}

async function getAPIRisk() {
    const params = {
        TableName: dynamodbTableName
    };
    const allDatas = await scanAPIDynamoRecords(params, []);
    const body = {
        datas: allDatas
    }
    return buildResponse(200, body);
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

async function getDevs() {
    const params = {
        TableName: dynamodbTableName_Dev
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

async function scanAPIDynamoRecords(scanParams, itemArray) {
    try {
        const dynamoData = await dynamodb.scan(scanParams).promise();
        itemArray = itemArray.concat(dynamoData.Items.filter((value)=>value.owner=='-'));
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

async function saveDev(requestBody) {
    const params = {
        TableName: dynamodbTableName_Dev,
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

async function editData(riskID, updateKey, updateValue) {
    const params = {
      TableName: dynamodbTableName,
      Key: {
        'riskID': riskID
      },
      UpdateExpression: `set ${updateKey} = :value`,
      ExpressionAttributeValues: {
        ':value': updateValue
      },
      ReturnValues: 'UPDATED_NEW'
    }
    return await dynamodb.update(params).promise().then((response) => {
      const body = {
        Operation: 'UPDATE',
        Message: 'SUCCESS',
        UpdatedAttributes: response
      }
      return buildResponse(200, body);
    }, (error) => {
        console.error("Error: ", error);
    })
}
  
async function deleteData(riskID) {
    const params = {
      TableName: dynamodbTableName,
      Key: {
        'riskID': parseInt(riskID)
      },
      ReturnValues: 'ALL_OLD'
    }
    return await dynamodb.delete(params).promise().then((response) => {
      const body = {
        Operation: 'DELETE',
        Message: 'SUCCESS',
        Item: response
      }
      return buildResponse(200, body);
    }, (error) => {
      console.error('Error: ', error);
    })
}

async function deleteDev(key) {
    const params = {
      TableName: dynamodbTableName_Dev,
      Key: {
        'key': parseInt(key)
      },
      ReturnValues: 'ALL_OLD'
    }
    return await dynamodb.delete(params).promise().then((response) => {
      const body = {
        Operation: 'DELETE',
        Message: 'SUCCESS',
        Item: response
      }
      return buildResponse(200, body);
    }, (error) => {
      console.error('Error: ', error);
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