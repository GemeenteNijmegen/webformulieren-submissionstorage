import * as https from 'https';
import { APIGatewayProxyResult, APIGatewayProxyEvent } from 'aws-lambda';
import MessageValidator from 'sns-validator';
import { SubmissionHandler } from './SubmissionHandler';

const submissionHandler = new SubmissionHandler();

export async function handler(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  try {
    console.debug(event);

    // Validate SNS message
    try {
      if (event.body) {
        const messageBodyJson = JSON.parse(event.body);
        return await submissionHandler.handleRequest(messageBodyJson);
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

export async function validateMessage(message: any): Promise<any> {
  const validator = new MessageValidator();
  return new Promise((resolve, reject) => {
    validator.validate(message, (err, aMessage) => {
      if (err) {
        return reject(err);
      }
      if (aMessage?.Type === 'SubscriptionConfirmation' && aMessage.SubscribeURL) {
        https.get(aMessage.SubscribeURL, function (_res) {
          // You have confirmed your endpoint subscription
        });
      }
      resolve(aMessage);
    });
  });
}
