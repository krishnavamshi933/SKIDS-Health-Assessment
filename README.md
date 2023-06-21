# Video Processing Workflow with AWS CDK

This repository contains the code and CloudFormation template to set up a video processing workflow using AWS CDK (Cloud Development Kit). The workflow involves extracting frames from an MP4 video file at regular intervals and saving them to an output S3 bucket.

## Prerequisites

Before deploying the video processing workflow, make sure you have the following prerequisites:

- AWS CLI installed and configured with appropriate credentials.
- Node.js and npm installed.
- Basic knowledge of AWS CDK and AWS services.

## Getting Started

To set up the video processing workflow, follow these steps:

1. Clone the repository to your local machine:
git clone https://github.com/your-username/video-processing-cdk.git

2. Move into the project directory:
cd video-processing-cdk

3. Install the required dependencies:
npm install

4. Deploy the CDK stack:
cdk deploy

5. Once the stack is deployed, upload an MP4 file to the input S3 bucket using the AWS CLI:
aws s3 cp /path/to/your/file.mp4 s3://input-bucket-name/

Replace `/path/to/your/file.mp4` with the actual path to the MP4 file on your local machine and `input-bucket-name` with the name of the input S3 bucket.

6. The Lambda function will be triggered automatically upon file upload, and it will start an AWS Batch job using AWS Elemental MediaConvert to extract frames from the video at every 30-second interval. The extracted frames will be saved to the output S3 bucket.

## Project Structure

The repository structure is as follows:

- `lambda/`: Contains the Lambda function code for frame extraction.
- `lib/`: Contains the CDK stack definition in TypeScript.
- `template.yaml`: CloudFormation template for creating the necessary AWS resources.
- `README.md`: This README file.

## Cleanup

To remove the resources created by the video processing workflow, run the following command:
cdk destroy
Remember to replace placeholders like your-username, input-bucket-name, and /path/to/your/file.mp4 with the appropriate values.
