from typing import Annotated
from typing_extensions import TypedDict
from langgraph.graph import StateGraph, START, END
from langgraph.graph.message import add_messages
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain.output_parsers import StructuredOutputParser, ResponseSchema
# import asyncio

llm = ChatGoogleGenerativeAI(model="gemini-2.5-flash")


class AgentState(TypedDict):
    messages: Annotated[list, add_messages]
    memory: list
    result: dict
    formatted_response: bool
    schema: dict


def agent(state: AgentState):
    if state.get("formatted_response") and state.get("schema"):
        schemas = []

        for field, props in state["schema"]["properties"].items():
            description = f"Type: {props['type']}"
            schemas.append(ResponseSchema(name=field, description=description))

        parser = StructuredOutputParser.from_response_schemas(schemas)
        format_instructions = parser.get_format_instructions()

        prompt = f"""
        You are an assistant. Follow the user-provided schema.
        Schema: {state["schema"]}
        {format_instructions}

        User messages:
        {state["messages"]}
        """
        response = llm.invoke(prompt)
        parsed = parser.parse(response.content)

        return {"messages": [response], "result": parsed}
    else:
        response = llm.invoke(state["messages"])
        return {"messages": [response], "result": {"answer": response.content}}


def memory_node(state: AgentState):
    if "messages" in state and state["messages"]:
        state["memory"].append(state["messages"][-1])
    return {"memory": state["memory"]}


graph_builder = StateGraph(AgentState)
graph_builder.add_node("agent", agent)
graph_builder.add_node("memory", memory_node)
graph_builder.add_edge(START, "agent")
graph_builder.add_edge("agent", "memory")
graph_builder.add_edge("memory", END)
graph = graph_builder.compile()


async def execute_agent(
    user_schema: dict, messages: list[str], formatted_response: bool
):
    response = await graph.invoke(
        {
            "messages": messages,
            "memory": [],
            "result": {},
            "formatted_response": formatted_response,
            "schema": user_schema,
        }
    )
    return response


# asyncio.run(execute_agent())
