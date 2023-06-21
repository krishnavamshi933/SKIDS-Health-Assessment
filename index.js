const AWS = require('aws-sdk');
const s3 = new AWS.S3();
const batch = new AWS.Batch();

exports.handler = async (event, context) => {
  try {
    const inputBucket = event.Records[0].s3.bucket.name;
    const inputKey = event.Records[0].s3.object.key;
    const outputBucket = 'output-bucket-name';
    const outputPrefix = 'frames/';

    const createJobResponse = await batch.createJob({
      jobName: 'video-processing-job',
      jobDefinition: 'video-processing-job-definition',
      jobQueue: 'video-processing-job-queue',
      containerOverrides: {
        environment: [
          { name: 'INPUT_BUCKET', value: inputBucket },
          { name: 'INPUT_KEY', value: inputKey },
          { name: 'OUTPUT_BUCKET', value: outputBucket },
          { name: 'OUTPUT_PREFIX', value: outputPrefix }
        ]
      }
    }).promise();

    console.log('Batch job created:', createJobResponse);

    return {
      statusCode: 200,
      body: 'Batch job created successfully.'
    };
  } catch (error) {
    console.error('Error starting Batch job:', error);
    return {
      statusCode: 500,
      body: 'Error starting Batch job.'
    };
  }
};
