import * as cdk from 'aws-cdk-lib';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as batch from 'aws-cdk-lib/aws-batch';

export class VideoProcessingStack extends cdk.Stack {
  constructor(scope: cdk.Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // Create S3 buckets
    const inputBucket = new s3.Bucket(this, 'InputBucket', {
      bucketName: 'input-bucket-name',
    });

    const outputBucket = new s3.Bucket(this, 'OutputBucket', {
      bucketName: 'output-bucket-name',
    });

    // Create Lambda function
    const processVideoLambda = new lambda.Function(this, 'ProcessVideoLambda', {
      functionName: 'process-video-lambda',
      runtime: lambda.Runtime.NODEJS_14_X,
      timeout: cdk.Duration.seconds(300),
      handler: 'index.handler',
      code: lambda.Code.fromAsset('lambda'),
      environment: {
        INPUT_BUCKET: inputBucket.bucketName,
        OUTPUT_BUCKET: outputBucket.bucketName,
      },
      role: new iam.Role(this, 'ProcessVideoLambdaRole', {
        assumedBy: new iam.ServicePrincipal('lambda.amazonaws.com'),
      }),
    });

    processVideoLambda.addToRolePolicy(
      new iam.PolicyStatement({
        actions: ['s3:GetObject', 's3:PutObject'],
        resources: [
          inputBucket.bucketArn + '/*',
          outputBucket.bucketArn + '/*',
        ],
      })
    );

    processVideoLambda.addToRolePolicy(
      new iam.PolicyStatement({
        actions: ['batch:SubmitJob'],
        resources: ['*'],
      })
    );

    // Create Batch job definition
    const videoProcessingJobDefinition = new batch.JobDefinition(
      this,
      'VideoProcessingJobDefinition',
      {
        jobDefinitionName: 'video-processing-job-definition',
        container: {
          image: 'your-video-processing-image',
          vcpus: 1,
          memoryLimitMiB: 2048,
          command: [
            '/bin/sh',
            '-c',
            `ffmpeg -i s3://\${INPUT_BUCKET}/\${INPUT_KEY} -vf "select=not(mod(n\\,900)),setpts=N/FRAME_RATE/TB" -r 1/30 s3://\${OUTPUT_BUCKET}/\${OUTPUT_PREFIX}%04d.png`,
          ],
          environment: {
            INPUT_BUCKET: inputBucket.bucketName,
            OUTPUT_BUCKET: outputBucket.bucketName,
            OUTPUT_PREFIX: 'frames/',
          },
        },
      }
    );

    // Create Batch job queue
    const videoProcessingJobQueue = new batch.JobQueue(
      this,
      'VideoProcessingJobQueue',
      {
        jobQueueName: 'video-processing-job-queue',
        priority: 1,
        computeEnvironments: [
          {
            computeEnvironment: 'your-compute-environment',
            order: 1,
          },
        ],
      }
    );
  }
}

const app = new cdk.App();
new VideoProcessingStack(app, 'VideoProcessingStack');
