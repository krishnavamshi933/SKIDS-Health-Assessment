import * as cdk from 'aws-cdk-lib';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as eventSources from 'aws-cdk-lib/aws-lambda-event-sources';
import * as mediaconvert from 'aws-cdk-lib/aws-mediaconvert';
import * as iam from 'aws-cdk-lib/aws-iam';

export class VideoProcessingCdkStack extends cdk.Stack {
  constructor(scope: cdk.Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // Input S3 Bucket
    const inputBucket = new s3.Bucket(this, 'InputBucket', {
      bucketName: 'input-project',
    });

    // Output S3 Bucket
    const outputBucket = new s3.Bucket(this, 'OutputBucket', {
      bucketName: 'project-outpu',
    });

    // Lambda function for frame extraction
    const frameExtractionFunction = new lambda.Function(this, 'FrameExtractionFunction', {
      runtime: lambda.Runtime.NODEJS_14_X,
      handler: 'index.handler',
      code: lambda.Code.fromAsset('lambda'),
      environment: {
        OUTPUT_BUCKET_NAME: outputBucket.bucketName,
        MEDIA_CONVERT_ROLE_ARN: mediaConvertRole.roleArn,
      },
    });

    // Grant the Lambda function permissions to access the input and output S3 buckets
    inputBucket.grantRead(frameExtractionFunction);
    outputBucket.grantWrite(frameExtractionFunction);

    // Trigger the Lambda function when a file is uploaded to the input bucket
    frameExtractionFunction.addEventSource(new eventSources.S3EventSource(inputBucket, {
      events: [s3.EventType.OBJECT_CREATED],
    }));

    // IAM role for AWS Elemental MediaConvert
    const mediaConvertRole = new iam.Role(this, 'MediaConvertRole', {
      assumedBy: new iam.ServicePrincipal('mediaconvert.amazonaws.com'),
    });

    // Define the MediaConvert job settings
    const jobSettings: mediaconvert.CfnJobTemplate.SettingsProperty = {
      inputs: [{
        fileInput: `s3://${inputBucket.bucketName}/{input.key}`,
      }],
      outputGroups: [{
        outputGroupSettings: {
          type: 'FILE_GROUP_SETTINGS',
          fileGroupSettings: {
            destination: {
              s3Bucket: outputBucket.bucketName,
            },
          },
        },
        outputs: [{
          videoDescription: {
            codecSettings: {
              codec: 'FRAME_CAPTURE',
              frameCaptureSettings: {
                captureInterval: 30,
                format: 'jpg',
              },
            },
          },
          outputSettings: {
            s3OutputSettings: {
              outputS3BucketName: outputBucket.bucketName,
            },
          },
        }],
      }],
    };

    // Create the MediaConvert job template
    const jobTemplate = new mediaconvert.CfnJobTemplate(this, 'FrameExtractionJobTemplate', {
      settings: jobSettings,
      role: mediaConvertRole.roleArn,
    });

    // Output the ARN of the MediaConvert job template
    new cdk.CfnOutput(this, 'MediaConvertJobTemplateArn', {
      value: jobTemplate.ref,
    });
  }
}
