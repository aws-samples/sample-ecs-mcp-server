import * as ec2 from "aws-cdk-lib/aws-ec2";
import * as iam from "aws-cdk-lib/aws-iam";
import * as ecs from "aws-cdk-lib/aws-ecs";
import * as logs from "aws-cdk-lib/aws-logs";
import { Construct } from "constructs";
import { Duration } from "aws-cdk-lib";

export interface ECSServiceProps {
  readonly cluster: ecs.Cluster;
  readonly taskRole: iam.Role;
  readonly containerImage: ecs.ContainerImage;
  readonly serviceName: string;
  readonly cloudMapNamespace: string;
  readonly cpu?: number;
  readonly memory?: number;
  readonly containerEnvironment?: {
    [key: string]: string;
  };
  readonly subnetType?: ec2.SubnetType;
  readonly containerPort?: number;
  readonly securityGroup?: ec2.SecurityGroup;
}

export class ECSService extends Construct {
  public readonly service: ecs.FargateService;

  constructor(scope: Construct, id: string, props: ECSServiceProps) {
    super(scope, id);

    const {
      cpu,
      memory,
      cluster,
      taskRole,
      subnetType,
      serviceName,
      securityGroup,
      containerPort,
      containerImage,
      cloudMapNamespace,
      containerEnvironment,
    } = props;

    const taskDefinition = new ecs.FargateTaskDefinition(
      this,
      "TaskDefinition",
      {
        taskRole,
        cpu: cpu || 512,
        memoryLimitMiB: memory || 1024,
        runtimePlatform: {
          cpuArchitecture: ecs.CpuArchitecture.ARM64,
          operatingSystemFamily: ecs.OperatingSystemFamily.LINUX,
        },
      }
    );
    taskDefinition.addContainer("image", {
      containerName: serviceName,
      image: containerImage,
      memoryLimitMiB: memory || 1024,
      memoryReservationMiB: memory || 1024,
      cpu: cpu || 512,
      stopTimeout: Duration.seconds(120),
      environment: containerEnvironment,
      portMappings: [
        {
          containerPort: containerPort || 3000,
          name: "web",
        },
      ],
      logging: ecs.LogDrivers.awsLogs({
        streamPrefix: "ecs",
        logGroup: new logs.LogGroup(this, `${serviceName}Logs`, {
          logGroupName: `${serviceName}-Logs`,
        }),
      }),
    });

    this.service = new ecs.FargateService(this, "Service", {
      cluster,
      taskDefinition,
      desiredCount: 1,
      securityGroups: securityGroup ? [securityGroup] : undefined,
      vpcSubnets: {
        subnetType: subnetType || ec2.SubnetType.PRIVATE_WITH_EGRESS,
      },
      serviceConnectConfiguration: {
        namespace: cloudMapNamespace,
        services: [
          {
            portMappingName: "web",
            dnsName: serviceName,
            discoveryName: serviceName,
          },
        ],
      },
    });

    const scaling = this.service.autoScaleTaskCount({
      minCapacity: 1,
      maxCapacity: 10,
    });
    scaling.scaleOnCpuUtilization("CpuScaling", {
      targetUtilizationPercent: 70,
      scaleInCooldown: Duration.seconds(60),
      scaleOutCooldown: Duration.seconds(60),
    });
  }
}
