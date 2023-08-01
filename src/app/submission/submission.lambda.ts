import { APIGatewayProxyResult, APIGatewayProxyEvent } from 'aws-lambda';
import MessageValidator from 'sns-validator';
import https from 'https';

export async function handler(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  try {
    console.debug(event);

    // Validate SNS message
    try {
      if(event.body) {
        const messageBodyJson = JSON.parse(event.body);
        validateMessage(messageBodyJson);
        return {
          statusCode: 200,
          body: messageBodyJson
        }
      } else {
        return {
          statusCode: 400,
          body: 'No message body',
        }; 
      }
    } catch (error: any) {
      console.error(error);
      return {
        statusCode: 500,
        body: '',
      }; 
    }
    // Extract userid (bsn/kvk) from message and use as key for dynamodb

    // Get form definition from form.io

    // Store in s3, keyed in dynamodb

    return {
      statusCode: 200,
      body: 'ok!',
    };
  } catch (Error) {
    console.error('Error handling request: ', Error);
    return {
      statusCode: 500,
      body: '',
    };
  }
}

/**
 * Validates the SNS message signature
 * 
 * Guarantees the message source is the
 * SNS topic it claims it was sent from.
 * 
 * This method also handles confirming
 * topic subscription as a convenience.
 * 
 * @param message a message from SNS
 * @returns {true|any} true to confirm subscription, the actual message otherwise.
 */
export function validateMessage(jsonMessage: any) {
  const validator = new MessageValidator();
  console.debug('validating');
  return validator.validate(jsonMessage, function (err: Error|null, message) {
    console.debug('starting', message);
    if (err) {
        console.error(err);
        throw err;
    }
    if (message?.['Type'] === 'SubscriptionConfirmation' && message['SubscribeURL']) {
      console.debug('subscribing');
      https.get(message['SubscribeURL'], function (_res) {
        // You have confirmed your endpoint subscription
      });
      return true;
    }
    if (message?.['Type'] === 'Notification') {
      console.debug('returning message');
      return message;
    }
    console.error('Unhandled valid message');
    throw Error('Couldn\'t handle message');
  });
}
