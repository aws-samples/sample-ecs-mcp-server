import * as ec2 from "aws-cdk-lib/aws-ec2";
import * as iam from "aws-cdk-lib/aws-iam";
import * as ecs from "aws-cdk-lib/aws-ecs";
import * as ecr_assets from "aws-cdk-lib/aws-ecr-assets";
import * as path from "path";
import { Construct } from "constructs";
import { ECSService } from "../constructs/ecsService";
import { NagSuppressions } from "cdk-nag";
import { Stack } from "aws-cdk-lib";

export interface MCPServiceOneProps {
  readonly cloudMapNamespace: string;
  readonly cluster: ecs.Cluster;
  readonly vpc: ec2.Vpc;
  readonly aiServiceSecurityGroup: ec2.SecurityGroup;
}

export class MCPServiceOne extends Construct {
  public readonly service: ECSService;
  public readonly serviceName: string;
  public readonly servicePort: number;

  constructor(scope: Construct, id: string, props: MCPServiceOneProps) {
    super(scope, id);

    const { vpc, aiServiceSecurityGroup, cluster, cloudMapNamespace } = props;

    this.serviceName = "mcp-one";
    this.servicePort = 8000;

    const securityGroup = new ec2.SecurityGroup(
      scope,
      `SG${this.serviceName}`,
      {
        vpc,
        allowAllOutbound: true,
      }
    );
    securityGroup.addIngressRule(
      ec2.Peer.securityGroupId(aiServiceSecurityGroup.securityGroupId),
      ec2.Port.tcp(this.servicePort),
      "Inbound from AI Service SG",
      false
    );

    const mcpServiceOneImage = new ecr_assets.DockerImageAsset(
      this,
      "MCPServiceOneImage",
      {
        directory: path.join(__dirname, "../../services/mcp-one"),
      }
    );

    this.service = new ECSService(this, "ECSService", {
      cluster,
      cloudMapNamespace,
      serviceName: this.serviceName,
      containerImage:
        ecs.ContainerImage.fromDockerImageAsset(mcpServiceOneImage),
      taskRole: new iam.Role(this, "TaskRole", {
        assumedBy: new iam.ServicePrincipal("ecs-tasks.amazonaws.com"),
      }),
      containerPort: this.servicePort,
      securityGroup,
    });

    this.addSupressions();
  }

  private addSupressions() {
    NagSuppressions.addResourceSuppressionsByPath(
      Stack.of(this),
      "/EcsMcpServerSampleStack/MCPOne/ECSService/TaskDefinition/ExecutionRole/DefaultPolicy/Resource",
      [
        {
          id: "AwsSolutions-IAM5",
          reason:
            "Role automatically created by cdk with permissions to pull docker images and write logs",
        },
      ]
    );
  }
}
