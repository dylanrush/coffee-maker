var AWS = require("aws-sdk");

function sendNotification(device, newState, token, callback) {
    var sqs = new AWS.SQS();
    var params = {
        MessageBody: JSON.stringify({
            device: device,
            newState: newState,
            currentTime: (new Date()).toISOString(),
            token: token
        }),
        MessageGroupId: device,
        QueueUrl: 'https://sqs.us-east-1.amazonaws.com/088831977567/smarthome-updates.fifo'
    };
    sqs.sendMessage(params, function (err, data) {
        if (err) {
            console.log(err, err.stack);
            callback("UNKNOWN");
        } else {
            console.log(data);
            callback(newState);
        }
    });
}

exports.handler = function (request, context) {
    console.log("Request: "+JSON.stringify(request));
    console.log("Context: "+JSON.stringify(context));
    if (request.directive.header.namespace === 'Alexa.Discovery' && request.directive.header.name === 'Discover') {
        log("DEBUG:", "Discover request", JSON.stringify(request));
        handleDiscovery(request, context, "");
    } else if (request.directive.header.namespace === 'Alexa.PowerController') {
        if (request.directive.header.name === 'TurnOn' || request.directive.header.name === 'TurnOff') {
            log("DEBUG:", "TurnOn or TurnOff Request", JSON.stringify(request));
            handlePowerControl(request, context);
        }
    }
    if (request.directive.header.namespace === 'Alexa' && request.directive.header.name === 'ReportState') {
        // See: https://developer.amazon.com/docs/device-apis/alexa-interface.html#reportstate
    }

    function handleDiscovery(request, context) {
        var payload = {
            "endpoints": [{
                "endpointId": "dylans_covfefe_maker",
                "manufacturerName": "Dylan's Custom Electronics",
                "friendlyName": "Coffee Maker",
                "description": "This is a basic coffee maker",
                "displayCategories": ["SMARTPLUG"],
                "cookie": {
                    "type": "chocolate chip"
                },
                "capabilities": [{
                        "type": "AlexaInterface",
                        "interface": "Alexa",
                        "version": "3"
                    },
                    {
                        "interface": "Alexa.PowerController",
                        "version": "3",
                        "type": "AlexaInterface",
                        "properties": {
                            "supported": [{
                                "name": "powerState"
                            }],
                            "retrievable": true
                        }
                    }
                ]
            }]
        };
        var header = request.directive.header;
        header.name = "Discover.Response";
        log("DEBUG", "Discovery Response: ", JSON.stringify({
            header: header,
            payload: payload
        }));
        context.succeed({
            event: {
                header: header,
                payload: payload
            }
        });
    }

    function log(message, message1, message2) {
        console.log(message + message1 + message2);
    }

    function handlePowerControl(request, context) {
        // get device ID passed in during discovery
        var requestMethod = request.directive.header.name;
        var responseHeader = request.directive.header;
        responseHeader.namespace = "Alexa";
        responseHeader.name = "Response";
        responseHeader.messageId = responseHeader.messageId + "-R";
        // get user token pass in request
        var requestToken = request.directive.endpoint.scope.token;
        var endopointId = request.directive.endpoint.endopointId;
        var newState = requestMethod === "TurnOn" ? "ON" : "OFF";
        sendNotification("CoffeeMaker", newState, requestToken, function callback(powerResult) {

            var contextResult = {
                "properties": [{
                    "namespace": "Alexa.PowerController",
                    "name": "powerState",
                    "value": powerResult,
                    "timeOfSample": (new Date()).toISOString(),
                    "uncertaintyInMilliseconds": 50
                }]
            };
            var errorResponse = {
                event: {
                    header: {
                        namespace: "Alexa",
                        name: "ErrorResponse",
                        messageId: "abc-123-def-456",
                        correlationToken: "dFMb0z+PgpgdDmluhJ1LddFvSqZ/jCc8ptlAKulUj90jSqg==",
                        payloadVersion: "3"
                    },
                    endpoint: {
                        endpointId: endopointId
                    },
                    payload: {
                        type: "ENDPOINT_UNREACHABLE",
                        message: "Unable to reach endpoint because it appears to be offline"
                    }
                }
            };

            var response = {
                context: contextResult,
                event: {
                    header: responseHeader,
                    endpoint: {
                        scope: {
                            type: "BearerToken",
                            token: requestToken
                        },
                        endpointId: endopointId
                    },
                    payload: {}
                }
            };
            log("DEBUG", "Alexa.PowerController ", JSON.stringify(response));
            context.succeed(response);
        });

    }
};