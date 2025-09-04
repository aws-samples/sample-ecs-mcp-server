import * as cdk from "aws-cdk-lib";
import { Construct } from "constructs";
import { Networking } from "./constructs/networking";
import { ECSCluster } from "./constructs/ecsCluster";
import { AIService } from "./services/AIService";
import { MCPServiceOne } from "./services/MCPServiceOne";
import { MCPServiceTwo } from "./services/MCPServiceTwo";
import { LoadBalancer } from "./constructs/loadBalancer";
import { Storage } from "./constructs/storage";

export class EcsMcpServerSampleStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const cloudMapNamespace = "services.local";

    const storage = new Storage(this, "Storage", {});

    const networking = new Networking(this, "Networking", {
      accessLogsBucket: storage.accessLogsBucket,
    });

    const ecs = new ECSCluster(this, "ECS", {
      vpc: networking.vpc,
      cloudMapNamespace,
    });

    const loadBalancer = new LoadBalancer(this, "ALB", {
      accessLogsBucket: storage.accessLogsBucket,
      vpc: networking.vpc,
    });

    const mcpOne = new MCPServiceOne(this, "MCPOne", {
      aiServiceSecurityGroup: networking.aiServiceSecurityGroup,
      cluster: ecs.cluster,
      vpc: networking.vpc,
      cloudMapNamespace,
    });

    const mcpTwo = new MCPServiceTwo(this, "MCPTwo", {
      aiServiceSecurityGroup: networking.aiServiceSecurityGroup,
      cluster: ecs.cluster,
      vpc: networking.vpc,
      cloudMapNamespace,
    });

    new AIService(this, "AiService", {
      aiServiceSecurityGroup: networking.aiServiceSecurityGroup,
      mcpServiceOne: {
        serviceName: mcpOne.serviceName,
        servicePort: mcpOne.servicePort,
      },
      mcpServiceTwo: {
        serviceName: mcpTwo.serviceName,
        servicePort: mcpTwo.servicePort,
      },
      cluster: ecs.cluster,
      vpc: networking.vpc,
      cloudMapNamespace,
      loadBalancer,
    });
  }
}
