FROM public.ecr.aws/docker/library/python:3.12-slim

RUN pip install uv

ENV AWS_API_MCP_TRANSPORT=streamable-http

# use an existing MCP server: https://github.com/awslabs/mcp/tree/main/src/aws-api-mcp-server

CMD [ "uvx", "awslabs.aws-api-mcp-server@latest" ]
