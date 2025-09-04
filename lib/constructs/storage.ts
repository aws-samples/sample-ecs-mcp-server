import * as s3 from "aws-cdk-lib/aws-s3";
import { NagSuppressions } from "cdk-nag";
import { Construct } from "constructs";

export interface StorageProps {}

export class Storage extends Construct {
  public readonly accessLogsBucket: s3.Bucket;

  constructor(scope: Construct, id: string, props: StorageProps) {
    super(scope, id);

    this.accessLogsBucket = new s3.Bucket(this, "AccessLogs", {
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      encryption: s3.BucketEncryption.S3_MANAGED,
      publicReadAccess: false,
      enforceSSL: true,
    });

    this.addSuppressions();
  }

  private addSuppressions() {
    NagSuppressions.addResourceSuppressions(this.accessLogsBucket, [
      {
        id: "AwsSolutions-S1",
        reason: "Access Logs bucket doesn't need server access logs",
      },
    ]);
  }
}
