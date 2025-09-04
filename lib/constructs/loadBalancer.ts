import * as elb from "aws-cdk-lib/aws-elasticloadbalancingv2";
import * as ec2 from "aws-cdk-lib/aws-ec2";
import * as s3 from "aws-cdk-lib/aws-s3";
import { Construct } from "constructs";
import { CfnOutput, Duration } from "aws-cdk-lib";
import { NagSuppressions } from "cdk-nag";

export interface LoadBalancerProps {
  readonly accessLogsBucket: s3.Bucket;
  readonly vpc: ec2.Vpc;
}

export class LoadBalancer extends Construct {
  public readonly securityGroup: ec2.SecurityGroup;
  public readonly loadBalancer: elb.ApplicationLoadBalancer;

  constructor(scope: Construct, id: string, props: LoadBalancerProps) {
    super(scope, id);

    const { accessLogsBucket, vpc } = props;

    this.securityGroup = new ec2.SecurityGroup(scope, "ALBSg", {
      vpc,
      allowAllOutbound: true,
    });
    this.securityGroup.addIngressRule(ec2.Peer.anyIpv4(), ec2.Port.tcp(80));

    this.loadBalancer = new elb.ApplicationLoadBalancer(scope, "LoadBalancer", {
      vpc,
      securityGroup: this.securityGroup,
      internetFacing: true,
      idleTimeout: Duration.minutes(5),
    });
    this.loadBalancer.logAccessLogs(accessLogsBucket, "elb-logs");

    new CfnOutput(this, "LoadBalancerDNS", {
      value: this.loadBalancer.loadBalancerDnsName,
    });

    this.addSuppressions();
  }

  private addSuppressions() {
    NagSuppressions.addResourceSuppressions(this.securityGroup, [
      {
        id: "AwsSolutions-EC23",
        reason: "inbound access needed for external resource",
      },
    ]);
  }
}
