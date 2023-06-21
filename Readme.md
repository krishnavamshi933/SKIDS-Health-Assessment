Create a file named template.yaml with the following contents:
yaml
Copy code
Resources:
  InputBucket:
    Type: AWS::S3::Bucket
    Properties:
      BucketName: input-bucket-name

  OutputBucket:
    Type: AWS::S3::Bucket
    Properties:
      BucketName: output-bucket-name

  FrameExtractionFunction:
    Type: AWS::Lambda::Function
    Properties:
      FunctionName: frame-extraction-function
      Runtime: nodejs14.x
      Handler: index.handler
      Code:
        ZipFile: |
          const AWS = require('aws-sdk');
          const s3 = new AWS.S3();
          const mediaConvert = new AWS.MediaConvert();

          exports.handler = async (event, context) => {
            const bucketName = event.Records[0].s3.bucket.name;
            const objectKey = event.Records[0].s3.object.key;

            const jobSettings = {
              Inputs: [
                {
                  FileInput: `s3://${bucketName}/${objectKey}`
                }
              ],
              OutputGroups: [
                {
                  OutputGroupSettings: {
                    Type: "FILE_GROUP_SETTINGS",
                    FileGroupSettings: {
                      Destination: {
                        S3Bucket: { Ref: "OutputBucket" }
                      }
                    }
                  },
                  Outputs: [
                    {
                      VideoDescription: {
                        CodecSettings: {
                          Codec: "FRAME_CAPTURE",
                          FrameCaptureSettings: {
                            CaptureInterval: 30,
                            Format: "jpg"
                          }
                        }
                      },
                      OutputSettings: {
                        S3OutputSettings: {
                          OutputS3BucketName: { Ref: "OutputBucket" }
                        }
                      }
                    }
                  ]
                }
              ]
            };

            const createJobParams = {
              JobTemplate: "frame-extraction-job-template",
              UserMetadata: {
                SourceS3Bucket: bucketName,
                SourceS3Key: objectKey
              },
              Role: { Ref: "MediaConvertRole" },
              Settings: jobSettings
            };

            try {
              const response = await mediaConvert.createJob(createJobParams).promise();
              console.log("MediaConvert job created successfully:", response.Job.Id);
            } catch (error) {
              console.error("Error creating MediaConvert job:", error);
              throw error;
            }
          };
          
      Timeout: 300
      Role: !GetAtt LambdaExecutionRole.Arn
      Environment:
        Variables:
          OutputBucket: !Ref OutputBucket

  LambdaExecutionRole:
    Type: AWS::IAM::Role
    Properties:
      RoleName: lambda-execution-role
      AssumeRolePolicyDocument:
        Version: "2012-10-17"
        Statement:
          - Effect: Allow
            Principal:
              Service: lambda.amazonaws.com
            Action: sts:AssumeRole
      ManagedPolicyArns:
        - arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole
Create a file named index.js with the following contents:
javascript
Copy code
const AWS = require('aws-sdk');

exports.handler = async (event) => {
  const s3 = new AWS.S3();
  const mediaConvert = new AWS.MediaConvert();

  const inputBucket = event.Records[0].s3.bucket.name;
  const objectKey = event.Records[0].s3.object.key;

  const jobSettings = {
    Inputs: [
      {
        FileInput: `s3://${inputBucket}/${objectKey}`
      }
    ],
    OutputGroups: [
      {
        OutputGroupSettings: {
          Type: "FILE_GROUP_SETTINGS",
          FileGroupSettings: {
            Destination: {
              S3Bucket: process.env.OUTPUT_BUCKET_NAME
            }
          }
        },
        Outputs: [
          {
            VideoDescription: {
              CodecSettings: {
                Codec: "FRAME_CAPTURE",
                FrameCaptureSettings: {
                  CaptureInterval: 30,
                  Format: "jpg"
                }
              }
            },
            OutputSettings: {
              S3OutputSettings: {
                OutputS3BucketName: process.env.OUTPUT_BUCKET_NAME
              }
            }
          }
        ]
      }
    ]
  };

  const createJobParams = {
    JobTemplate: "frame-extraction-job-template",
    UserMetadata: {
      SourceS3Bucket: inputBucket,
      SourceS3Key: objectKey
    },
    Role: process.env.MEDIA_CONVERT_ROLE_ARN,
    Settings: jobSettings
  };

  try {
    const response = await mediaConvert.createJob(createJobParams).promise();
    console.log("MediaConvert job created successfully:", response.Job.Id);
  } catch (error) {
    console.error("Error creating MediaConvert job:", error);
    throw error;
  }
};
Initialize the CDK project:
shell
Copy code
cdk init --language=typescript
Install the required CDK libraries:
shell
Copy code
npm install @aws-cdk/aws-s3 @aws-cdk/aws-lambda @aws-cdk/aws-lambda-event-sources @aws-cdk/aws-mediaconvert @aws-cdk/aws-iam
Update the lib/cdk-stack.ts file with the following contents:
typescript
Copy code
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
      bucketName: 'input-bucket-name',
    });

    // Output S3 Bucket
    const outputBucket = new s3.Bucket(this, 'OutputBucket', {
      bucketName: 'output-bucket-name',
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
Install the AWS CDK and TypeScript dependencies:
shell
Copy code
npm install -g aws-cdk typescript
Compile the TypeScript code:
shell
Copy code
npm run build
Deploy the CDK stack:
shell
Copy code
cdk deploy
Once the stack is deployed, you can upload an MP4 file to the input S3 bucket using the AWS CLI:
shell
Copy code
aws s3 cp /path/to/your/file.mp4 s3://input-bucket-name/
Replace /path/to/your/file.mp4 with the actual path to the MP4 file on your local machine and input-bucket-name with the name of the input S3 bucket.

The Lambda function will be triggered automatically upon file upload, and it will start an AWS Batch job using AWS Elemental MediaConvert to extract frames from the video at every 30-second interval. The extracted frames will be saved to the output S3 bucket.
