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
  const { userPrompt } = event.queryStringParameters;

  const bodyConfig = {
    prompt: `\n\nHuman: ${userPrompt}.\n\nAssistant:`,
    max_tokens_to_sample: 300, // rough maximum for the response length
    temperature: 0.5, // 0-1. Higher values can increase randomness of word choices.
    top_k: 250, // Higher values can avoid repetition in the response.
    top_p: 0.5, // 0-1. Higher values increase word diversity.
    stop_sequences: ["\\n\\nHuman:"],
  };

 /* Initialize the LLM to use to answer the question */
const model = new Bedrock({ model: "anthropic.claude-instant-v1", 
region: "us-west-2"});


/* Create the vectorstore */
const retriever = new AmazonKendraRetriever({
  topK: 10,
  indexId: "725b295a-2729-4a32-bb0d-270790bc27db",
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
  `\n\nHuman:Use the following pieces of context to answer the question at the end. If you don't know the answer, just say that you don't know, don't try to make up an answer.
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
      const serialized = formatDocumentsAsString(relevantDocs);
      return serialized;
    },
  },
  questionPrompt,
  model,
  new StringOutputParser(),
]);

const questionOne = "What did the president say about Justice Breyer?";

const resultOne = await chain.invoke({
  question: questionOne,
});

console.log({ resultOne });
/**
 * {
 *   resultOne: 'The president thanked Justice Breyer for his service and described him as an Army veteran, Constitutional scholar, and retiring Justice of the United States Supreme Court.'
 * }
 */

const resultTwo = await chain.invoke({
  chatHistory: formatChatHistory(resultOne, questionOne),
  question: "Was it nice?",
});

console.log({ resultTwo });
/**
 * {
 *   resultTwo: "Yes, the president's description of Justice Breyer was positive."
 * }
 */
}

handler({queryStringParameters:"hello"})
