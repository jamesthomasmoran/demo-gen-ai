import { Bedrock } from "langchain/llms/bedrock";
import { HNSWLib } from "langchain/vectorstores/hnswlib";

import { PromptTemplate } from "langchain/prompts";
import { RunnableSequence } from "langchain/schema/runnable";
import { StringOutputParser } from "langchain/schema/output_parser";
import { formatDocumentsAsString } from "langchain/util/document";
import { AmazonKendraRetriever } from "langchain/retrievers/amazon_kendra";

export async function handler(event) {
  // Log the event to CloudWatch for easier troubleshooting when things go wrong.
  console.log(`EVENT: ${JSON.stringify(event)}`);


  // Grab the prompt text that the user submitted.
  let { userPrompt,chatHistory } = event.queryStringParameters;



 /* Initialize the LLM to use to answer the question */
const model = new Bedrock({ model: "meta.llama2-13b-chat-v1", 
region: "us-west-2",
maxTokens:2000
});


/* Create the vectorstore */
const retriever = new AmazonKendraRetriever({
  topK: 10,
  indexId: "57ffefef-4dbc-46bc-b7dd-b38189c0b2cf",
  region: "us-west-2", // Your region
});

console.log(retriever)


const formatChatHistory = (
  human,
  assistant,
  previousChatHistory
) => {
  const newInteraction = `\n\nHuman: ${human}.\n\nAssistant:${assistant}`;
  if (!previousChatHistory) {
    return newInteraction;
  }
  return `${previousChatHistory}\n\n${newInteraction}`;
};

/**
 * Create a prompt template for generating an answer based on context and
 * a question.
 *
 * Chat history will be an empty string if it's the first question.
 *
 * inputVariables: ["chatHistory", "context", "question"]
 */
const questionPrompt = PromptTemplate.fromTemplate(
  `\n\nHuman:You are an AI Assistant.Use the following pieces of context to answer the question at the end in less than 100 words.Remove special characters like &.Remove special characters like & from your answer. Do not mention using less than 100 words in your answer. If you don't know the answer, just say that you don't know, don't try to make up an answer. Do not mention the context in your answer
  ----------------
  CONTEXT: {context}
  ----------------
  CHAT HISTORY: {chatHistory}
  ----------------
  QUESTION: {question}
  ----------------
  \n\nAssistant:`
);

const chain = RunnableSequence.from([
  {
    question: (input) =>
      input.question,
    chatHistory: (input) =>
      input.chatHistory,
    context: async (input) => {
      const relevantDocs = await retriever.getRelevantDocuments(input.question);
      console.log(relevantDocs)
      const serialized = formatDocumentsAsString(relevantDocs);
      return serialized;
    },
  },
  questionPrompt,
  model,
  new StringOutputParser(),
]);


const result = await chain.invoke({
  chatHistory: chatHistory,
  question: userPrompt,
});
console.log(result)
chatHistory = formatChatHistory(userPrompt,result,chatHistory)
console.log(chatHistory)
var response = {
  statusCode: 200,
  headers: {
    "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "*",
  },
  
  body: JSON.stringify({
    "answer": result,
    "chatHistory": chatHistory
  })

}
console.log(response)
return response


}
