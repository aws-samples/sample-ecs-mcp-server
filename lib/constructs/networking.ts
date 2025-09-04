import * as ec2 from "aws-cdk-lib/aws-ec2";
import * as s3 from "aws-cdk-lib/aws-s3";
import { Construct } from "constructs";

export interface NetworkingProps {
  readonly accessLogsBucket: s3.Bucket;
  readonly cidr?: string;
}

export class Networking extends Construct {
  public readonly vpc: ec2.Vpc;
  public readonly aiServiceSecurityGroup: ec2.SecurityGroup;

  constructor(scope: Construct, id: string, props: NetworkingProps) {
    super(scope, id);

    this.vpc = new ec2.Vpc(this, "NewVpc", {
      maxAzs: 3,
      ipAddresses: ec2.IpAddresses.cidr(props.cidr || "192.168.0.0/16"),
      subnetConfiguration: [
        {
          name: "PublicForNatGateway",
          subnetType: ec2.SubnetType.PUBLIC,
        },
        {
          name: "PrivateWithEgress",
          subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS,
        },
        {
          name: "PrivateIsolatedSubnet",
          subnetType: ec2.SubnetType.PRIVATE_ISOLATED,
        },
      ],
      natGateways: 3,
      natGatewayProvider: ec2.NatProvider.gateway(),
    });

    this.vpc.addFlowLog("accessLogs", {
      destination: ec2.FlowLogDestination.toS3(
        props.accessLogsBucket,
        "vpc-logs"
      ),
    });

    this.aiServiceSecurityGroup = new ec2.SecurityGroup(this, "AISG", {
      vpc: this.vpc,
      allowAllOutbound: true,
    });
  }
}
