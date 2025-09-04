import * as ec2 from "aws-cdk-lib/aws-ec2";
import * as ecs from "aws-cdk-lib/aws-ecs";
import * as sdiscovery from "aws-cdk-lib/aws-servicediscovery";
import { Construct } from "constructs";

export interface ECSClusterProps {
  readonly vpc: ec2.Vpc;
  readonly cloudMapNamespace: string;
}

export class ECSCluster extends Construct {
  public readonly cluster: ecs.Cluster;

  constructor(scope: Construct, id: string, props: ECSClusterProps) {
    super(scope, id);

    this.cluster = new ecs.Cluster(this, "Cluster", {
      vpc: props.vpc,
      enableFargateCapacityProviders: true,
      containerInsightsV2: ecs.ContainerInsights.ENHANCED,
      defaultCloudMapNamespace: {
        name: props.cloudMapNamespace,
        useForServiceConnect: true,
        type: sdiscovery.NamespaceType.HTTP,
        vpc: props.vpc,
      },
    });
  }
}
