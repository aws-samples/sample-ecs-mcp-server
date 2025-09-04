import * as ec2 from "aws-cdk-lib/aws-ec2";
import * as iam from "aws-cdk-lib/aws-iam";
import * as ecs from "aws-cdk-lib/aws-ecs";
import * as secrets from "aws-cdk-lib/aws-secretsmanager";
import * as ecr_assets from "aws-cdk-lib/aws-ecr-assets";
import * as elb from "aws-cdk-lib/aws-elasticloadbalancingv2";
import { Construct } from "constructs";
import { ECSService } from "../constructs/ecsService";
import { LoadBalancer } from "../constructs/loadBalancer";
import * as path from "path";
import { CfnOutput, Duration, Stack } from "aws-cdk-lib";
import { NagSuppressions } from "cdk-nag";

export interface IServiceDetails {
  readonly serviceName: string;
  readonly servicePort: number;
}

export interface AIServiceProps {
  readonly cloudMapNamespace: string;
  readonly cluster: ecs.Cluster;
  readonly vpc: ec2.Vpc;
  readonly aiServiceSecurityGroup: ec2.SecurityGroup;
  readonly loadBalancer: LoadBalancer;
  readonly mcpServiceOne: IServiceDetails;
  readonly mcpServiceTwo: IServiceDetails;
}

export class AIService extends Construct {
  public readonly service: ECSService;
  public readonly serviceName: string;
  public readonly servicePort: 8000;

  constructor(scope: Construct, id: string, props: AIServiceProps) {
    super(scope, id);

    const {
      vpc,
      cluster,
      loadBalancer,
      mcpServiceOne,
      mcpServiceTwo,
      cloudMapNamespace,
      aiServiceSecurityGroup,
    } = props;

    this.serviceName = "ai-agent";
    this.servicePort = 8000;

    const aiServiceImage = new ecr_assets.DockerImageAsset(
      this,
      "AIServiceImage",
      {
        directory: path.join(__dirname, "../../services/ai-agent"),
      }
    );

    this.service = new ECSService(this, "ECSService", {
      cluster,
      cloudMapNamespace,
      serviceName: this.serviceName,
      containerImage: ecs.ContainerImage.fromDockerImageAsset(aiServiceImage),
      taskRole: new iam.Role(this, "TaskRole", {
        assumedBy: new iam.ServicePrincipal("ecs-tasks.amazonaws.com"),
        inlinePolicies: {
          BedrockAccess: new iam.PolicyDocument({
            statements: [
              new iam.PolicyStatement({
                actions: [
                  "bedrock:InvokeModel",
                  "bedrock:InvokeModelWithResponseStream",
                  "bedrock:Converse",
                  "bedrock:ConverseStream",
                ],
                resources: ["*"],
                effect: iam.Effect.ALLOW,
              }),
            ],
          }),
        },
      }),
      containerPort: this.servicePort,
      securityGroup: aiServiceSecurityGroup,
      containerEnvironment: {
        MCP_SERVICE_ONE_NAME: mcpServiceOne.serviceName,
        MCP_SERVICE_ONE_PORT: mcpServiceOne.servicePort.toString(),
        MCP_SERVICE_TWO_NAME: mcpServiceTwo.serviceName,
        MCP_SERVICE_TWO_PORT: mcpServiceTwo.servicePort.toString(),
      },
    });

    this.addServiceToLoadBalancer(vpc, loadBalancer, aiServiceSecurityGroup);
    this.addSuppressions();
  }

  private addServiceToLoadBalancer(
    vpc: ec2.Vpc,
    loadBalancer: LoadBalancer,
    aiServiceSecurityGroup: ec2.SecurityGroup
  ) {
    loadBalancer.securityGroup.addIngressRule(
      aiServiceSecurityGroup,
      ec2.Port.tcp(this.servicePort)
    );

    const applicationListener = new elb.ApplicationListener(
      this,
      "Port80Listener",
      {
        port: 80,
        protocol: elb.ApplicationProtocol.HTTP,
        loadBalancer: loadBalancer.loadBalancer,
        defaultAction: elb.ListenerAction.fixedResponse(403, {
          contentType: "application/json",
          messageBody: JSON.stringify({ error: "Forbidden" }),
        }),
      }
    );

    const serviceTargetGroup = new elb.ApplicationTargetGroup(this, "ATG", {
      vpc,
      port: this.servicePort,
      protocol: elb.ApplicationProtocol.HTTP,
      targetType: elb.TargetType.IP,
      healthCheck: {
        path: "/",
        timeout: Duration.seconds(30),
        interval: Duration.minutes(5),
        protocol: elb.Protocol.HTTP,
        port: this.servicePort.toString(),
        healthyHttpCodes: "200",
      },
    });

    const apiSecret = new secrets.Secret(this, "APISecret", {
      generateSecretString: {
        passwordLength: 20,
      },
    });

    applicationListener.addTargetGroups("TG", {
      priority: 1,
      targetGroups: [serviceTargetGroup],
      conditions: [
        elb.ListenerCondition.httpHeader("x-api-key", [
          apiSecret.secretValue.unsafeUnwrap(),
        ]),
        elb.ListenerCondition.pathPatterns(["/*"]),
      ],
    });
    serviceTargetGroup.addTarget(this.service.service);

    new CfnOutput(this, "SecretARN", {
      value: apiSecret.secretFullArn!,
    });
  }

  private addSuppressions() {
    NagSuppressions.addResourceSuppressionsByPath(
      Stack.of(this),
      "/EcsMcpServerSampleStack/AiService/APISecret/Resource",
      [
        {
          id: "AwsSolutions-SMG4",
          reason: "Secret rotation is not needed for this sample",
        },
      ]
    );

    NagSuppressions.addResourceSuppressionsByPath(
      Stack.of(this),
      "/EcsMcpServerSampleStack/AiService/ECSService/TaskDefinition/ExecutionRole/DefaultPolicy/Resource",
      [
        {
          id: "AwsSolutions-IAM5",
          reason:
            "Role automatically created by cdk with permissions to pull docker images and write logs",
        },
      ]
    );

    NagSuppressions.addResourceSuppressionsByPath(
      Stack.of(this),
      "/EcsMcpServerSampleStack/AiService/TaskRole/Resource",
      [
        {
          id: "AwsSolutions-IAM5",
          reason: "Wildcard required for access to Bedrock's FMs",
        },
      ]
    );

    NagSuppressions.addResourceSuppressionsByPath(
      Stack.of(this),
      "/EcsMcpServerSampleStack/AiService/ECSService/TaskDefinition/Resource",
      [
        {
          id: "AwsSolutions-ECS2",
          reason:
            "Environment do not contain any sensitive information, just host names and ports to be used for service-to-service calls",
        },
      ]
    );
  }
}
