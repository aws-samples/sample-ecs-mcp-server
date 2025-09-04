from mcp.server.fastmcp import FastMCP

mcp = FastMCP("Demo")

@mcp.tool()
def add(a: int, b: int) -> int:
    return a + b

@mcp.tool()
def subtract(a: int, b: int) -> int:
    return a - b

@mcp.tool()
def divide(a: int, b: int) -> int:
    if b == 0:
        return "Cannot divide by zero"

    return a / b

@mcp.tool()
def multiply(a: int, b: int) -> int:
    return a * b

@mcp.tool()
def mod(a: int, b: int) -> int:
    return a % b


def main():
    mcp.run(transport="streamable-http")


if __name__ == "__main__":
    main()