#!/usr/bin/env node
import * as cdk from "aws-cdk-lib";
import { EcsMcpServerSampleStack } from "../lib/ECSMCPServerSampleStack";
import { AwsSolutionsChecks } from "cdk-nag";

const app = new cdk.App();
new EcsMcpServerSampleStack(app, "EcsMcpServerSampleStack", {
  env: {
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region: process.env.CDK_DEFAULT_REGION,
  },
});

cdk.Aspects.of(app).add(new AwsSolutionsChecks());
