# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: Apache-2.0

"""
Purpose

Shows how to use the AWS SDK for Python (Boto3) with Amazon Simple Storage Service
(Amazon S3) to generate a presigned URL that can perform an action for a limited
time with your credentials. Also shows how to use the Requests package
to make a request with the URL.
"""

# snippet-start:[python.example_code.s3.Scenario_GeneratePresignedUrl]
import logging
import boto3
from botocore.exceptions import ClientError
import requests

logger = logging.getLogger(__name__)


def generate_presigned_url(s3_client, client_method, method_parameters, expires_in):
    """
    Generate a presigned Amazon S3 URL that can be used to perform an action.

    :param s3_client: A Boto3 Amazon S3 client.
    :param client_method: The name of the client method that the URL performs.
    :param method_parameters: The parameters of the specified client method.
    :param expires_in: The number of seconds the presigned URL is valid for.
    :return: The presigned URL.
    """
    try:
        url = s3_client.generate_presigned_url(
            ClientMethod=client_method,
            Params=method_parameters,
            ExpiresIn=expires_in
        )
        # logger.info("Got presigned URL: %s", url)
    except ClientError:
        logger.exception(
            "Couldn't get a presigned URL for client method '%s'.", client_method)
        raise
    return url


def generate(s3_url):
    logging.basicConfig(level=logging.INFO, format='%(levelname)s: %(message)s')

    print('-'*88)
    print("Welcome to the Amazon S3 presigned URL demo.")
    print('-'*88)

    bucket_name = s3_url.split('/')[2].split('.')[0]
    object_key = s3_url.split('/')[-1]
    
    print(bucket_name)

    s3_client = boto3.client('s3', region_name='us-west-2')
    client_action = 'get_object' 
    url = generate_presigned_url(
        s3_client, client_action, {'Bucket': bucket_name, 'Key': object_key}, 1000)
    return url
    
    
    


