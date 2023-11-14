import { DynamoDBChatMessageHistory} from "langchain/stores/message/dynamodb"

const history = new DynamoDBChatMessageHistory({tableName:"SessionTable", sessionId:"0"});
await history.addUserMessage("Hi!");

await history.addAIChatMessage("What's up?");
