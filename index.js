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
